#!/usr/bin/env node
// stdio MCP server that drives a Firefox instance over WebDriver BiDi.
// Needs `firefox-agent` (Firefox with --remote-debugging-port) running first.
// No dependencies: uses the WebSocket built into Node.
//
// Layout:
//   1. config
//   2. BiDi connection (send / call / attach / detach / context)
//   3. page helpers (evaluate, fromRemote, findElement, waitHeight)
//   4. input helpers (clickAt, typeKeys)
//   5. tools
//   6. MCP protocol
//   7. stdio transport
import { writeFileSync, writeSync } from 'node:fs';
import { makeDocsTools } from './docs-tools.mjs';

// ---------------------------------------------------------------- config

const PORT = Number(process.env.FIREFOX_BIDI_PORT || 9222);
const ENDPOINT = `ws://127.0.0.1:${PORT}/session`;

// A lost BiDi reply must never wedge the request queue, so every call has its
// own deadline.
const CALL_TIMEOUT = Number(process.env.FIREFOX_BIDI_TIMEOUT_MS || 25000);

const log = (...a) => process.stderr.write(a.join(' ') + '\n');
const q = (s) => JSON.stringify(s);

// -------------------------------------------------------- BiDi connection

let ws = null;
let attaching = null;
let seq = 0;
let ctxId = null;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++seq;
    const timer = setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      log('timeout', method);
      resolve({ type: 'error', error: 'timeout', message: `sin respuesta en ${CALL_TIMEOUT} ms` });
    }, CALL_TIMEOUT);
    pending.set(id, (res) => { clearTimeout(timer); resolve(res); });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function call(method, params = {}) {
  const res = await send(method, params);
  if (res.type === 'error') {
    const hint = res.message?.includes('Maximum number of active sessions')
      ? ' (Firefox ya tiene otra sesión BiDi colgada; reinícialo con firefox-agent)'
      : '';
    throw new Error(`${method}: ${res.error}${res.message ? ': ' + res.message : ''}${hint}`);
  }
  return res.result;
}

async function attach() {
  if (ws && ws.readyState === 1) return;
  if (attaching) return attaching;
  attaching = (async () => {
    const sock = new WebSocket(ENDPOINT);
    await new Promise((resolve, reject) => {
      sock.addEventListener('open', resolve, { once: true });
      sock.addEventListener('error', () => reject(new Error(
        `No pude conectar a ${ENDPOINT}. Corre firefox-agent primero.`)), { once: true });
    });
    sock.addEventListener('message', (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m.id && pending.has(m.id)) {
        const done = pending.get(m.id);
        pending.delete(m.id);
        done(m);
      }
    });
    sock.addEventListener('close', () => { ws = null; ctxId = null; });
    ws = sock;
    try {
      await call('session.new', { capabilities: {} });
    } catch (e) {
      ws = null;
      throw e;
    }
  })().finally(() => { attaching = null; });
  return attaching;
}

async function detach() {
  if (!ws || ws.readyState !== 1) return;
  try { await call('session.end', {}); } catch {}
  try { ws.close(); } catch {}
  ws = null;
  ctxId = null;
}

async function context() {
  // The cached id dies with its tab, so validate it against the live tree and
  // fall back to the visible tab instead of failing every call.
  const tree = await call('browsingContext.getTree', { maxDepth: 1 });
  const list = tree.contexts || [];
  if (ctxId && list.some((c) => c.context === ctxId)) return ctxId;
  ctxId = (await visibleContext(list)) || list[0]?.context;
  if (!ctxId) throw new Error('Firefox no tiene pestañas abiertas');
  return ctxId;
}

// Background tabs report visibilityState hidden, which is the only signal BiDi
// gives about which tab the user is looking at.
async function visibleContext(list) {
  for (const c of list) {
    try {
      const res = await call('script.evaluate', {
        expression: 'document.visibilityState',
        target: { context: c.context },
        awaitPromise: false,
        resultOwnership: 'none',
      });
      if (res?.result?.value === 'visible') return c.context;
    } catch {}
  }
  return null;
}

const isStaleContext = (e) => /no such frame|Browsing Context .* not found|invalid context/i.test(e?.message || '');

// ---------------------------------------------------------- page helpers

async function evaluate(expression) {
  const run = () => call('script.evaluate', {
    expression,
    target: { context: ctxId },
    awaitPromise: true,
    resultOwnership: 'none',
    serializationOptions: { maxObjectDepth: 3 },
  });
  await context();
  let res;
  try {
    res = await run();
  } catch (e) {
    // Tab closed or reloaded under us: drop the cached id and retry once.
    if (!isStaleContext(e)) throw e;
    ctxId = null;
    await context();
    res = await run();
  }
  if (res.type === 'exception') {
    throw new Error(res.exceptionDetails?.exception?.description || res.exceptionDetails?.text || 'error de JS');
  }
  return fromRemote(res.result);
}

// BiDi returns objects and arrays as [key, RemoteValue] pairs, so a plain
// object arrives as an array and its properties read as undefined.
function fromRemote(v) {
  if (!v || typeof v !== 'object') return v;
  switch (v.type) {
    case 'undefined': return undefined;
    case 'null': return null;
    case 'string': case 'number': case 'boolean': case 'bigint': return v.value;
    case 'array': case 'set': return (v.value || []).map(fromRemote);
    case 'object': {
      const o = {};
      for (const [k, val] of v.value || []) {
        o[typeof k === 'string' ? k : String(fromRemote(k))] = fromRemote(val);
      }
      return o;
    }
    case 'map': {
      const o = {};
      for (const [k, val] of v.value || []) o[String(fromRemote(k))] = fromRemote(val);
      return o;
    }
    default: return 'value' in v ? v.value : v;
  }
}

// Firefox applies setViewport but never sends the reply, so fire it off and
// swallow the dangling id instead of waiting forever.
function sendNoReply(method, params) {
  const id = ++seq;
  pending.set(id, () => {});
  ws.send(JSON.stringify({ id, method, params }));
}

async function waitHeight(target, shrink = false) {
  for (let i = 0; i < 50; i++) {
    let h = null;
    try { h = await evaluate('innerHeight'); } catch {}
    if (h !== null && (shrink ? h <= target + 20 : h >= target - 20)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

const findElement = (target) => `
(() => {
  const sel = ${q(target)};
  let el = null;
  try { el = document.querySelector(sel); } catch {}
  if (!el) {
    const want = sel.trim().toLowerCase();
    const all = [...document.querySelectorAll('a,button,input,textarea,select,[role=button],[role=link],[contenteditable=true]')];
    el = all.find(n => (n.innerText || n.value || n.getAttribute('aria-label') || '').trim().toLowerCase() === want)
      || all.find(n => (n.innerText || n.value || n.getAttribute('aria-label') || '').trim().toLowerCase().includes(want));
  }
  if (!el) return null;
  el.scrollIntoView({ block: 'center', inline: 'center' });
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, tag: el.tagName.toLowerCase() };
})()`;

// --------------------------------------------------------- input helpers

async function clickAt(x, y) {
  await call('input.performActions', {
    context: await context(),
    actions: [{
      type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' },
      actions: [
        { type: 'pointerMove', x: Math.round(x), y: Math.round(y), origin: 'viewport' },
        { type: 'pointerDown', button: 0 },
        { type: 'pointerUp', button: 0 },
      ],
    }],
  });
}

async function typeKeys(actions) {
  await call('input.performActions', { context: await context(), actions: [{ type: 'key', id: 'kb', actions }] });
}

const SPECIAL_KEYS = {
  Enter: '\uE007', Tab: '\uE004', Escape: '\uE00C', Backspace: '\uE003', Delete: '\uE017',
  ArrowLeft: '\uE012', ArrowUp: '\uE013', ArrowRight: '\uE014', ArrowDown: '\uE015',
  PageUp: '\uE00E', PageDown: '\uE00F', Home: '\uE011', End: '\uE010', Space: '\u0020',
};

// ---------------------------------------------------------------- tools

const tools = [
  {
    name: 'tabs',
    description: 'Lista pestañas del Firefox abierto. action=new abre una pestaña, switch cambia el foco, close cierra.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'new', 'switch', 'close'] },
        index: { type: 'number' },
        url: { type: 'string' },
      },
    },
    handler: async ({ action = 'list', index, url }) => {
      await attach();
      if (action === 'new') {
        const info = await call('browsingContext.create', { type: 'tab' });
        ctxId = info.context;
        if (url) await call('browsingContext.navigate', { context: ctxId, url, wait: 'complete' });
        return `pestaña nueva ${ctxId}${url ? ' ' + url : ''}`;
      }
      const tree = await call('browsingContext.getTree', { maxDepth: 1 });
      if (action === 'list') return tree.contexts.map((c, i) => `${i}: ${c.url}`).join('\n') || '(sin pestañas)';
      const target = tree.contexts[index ?? 0];
      if (!target) throw new Error(`no existe la pestaña ${index}`);
      ctxId = target.context;
      if (action === 'close') { await call('browsingContext.close', { context: target.context }); return 'cerrada'; }
      return `foco en ${target.url}`;
    },
  },
  {
    name: 'navigate',
    description: 'Navega la pestaña actual y espera la carga.',
    inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    handler: async ({ url }) => {
      await attach();
      const r = await call('browsingContext.navigate', { context: await context(), url, wait: 'complete' });
      return r.url || url;
    },
  },
  {
    name: 'evaluate',
    description: 'Ejecuta JavaScript en la página actual y devuelve el resultado.',
    inputSchema: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] },
    handler: async ({ expression }) => {
      await attach();
      const out = await evaluate(expression);
      return typeof out === 'string' ? out : JSON.stringify(out, null, 2);
    },
  },
  {
    name: 'snapshot',
    description: 'Resumen del DOM visible con selectores y texto, para elegir a qué dar clic.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    handler: async ({ limit = 120 }) => {
      await attach();
      return evaluate(`
(() => {
  const path = (el) => {
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    while (el && el.nodeType === 1 && parts.length < 6) {
      let p = el.nodeName.toLowerCase();
      const parent = el.parentElement;
      if (parent) p += ':nth-child(' + ([...parent.children].indexOf(el) + 1) + ')';
      parts.unshift(p); el = parent;
    }
    return parts.join(' > ');
  };
  const out = ['title: ' + document.title, 'url: ' + location.href, '---'];
  const nodes = [...document.querySelectorAll('a,button,input,textarea,select,h1,h2,h3,label,[role],[contenteditable=true],img')];
  let n = 0;
  for (const el of nodes) {
    if (n++ >= ${limit}) { out.push('... (' + nodes.length + ' nodos en total)'); break; }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.alt || '').replace(/\\s+/g, ' ').trim().slice(0, 90);
    out.push(el.tagName.toLowerCase() + (el.type ? '[type=' + el.type + ']' : '') + ' ' + path(el) + (text ? ' :: ' + text : ''));
  }
  return out.join('\\n');
})()`);
    },
  },
  {
    name: 'click',
    description: 'Clic real en un selector CSS, por texto, o en coordenadas x/y.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        x: { type: 'number' },
        y: { type: 'number' },
        dx: { type: 'number' },
        dy: { type: 'number' },
      },
    },
    handler: async ({ target, x, y, dx = 0, dy = 0 }) => {
      await attach();
      let hit;
      if (Number.isFinite(x) && Number.isFinite(y)) {
        hit = { x, y, tag: 'punto' };
      } else {
        const found = await evaluate(findElement(target));
        if (!found) throw new Error(`no encontré elemento: ${target}`);
        hit = { x: found.x + dx, y: found.y + dy, tag: found.tag };
      }
      await clickAt(hit.x, hit.y);
      return `clic en <${hit.tag}> ${target ?? `${Math.round(hit.x)},${Math.round(hit.y)}`}`;
    },
  },
  {
    name: 'cookies',
    description: 'Borra cookies del dominio actual o del indicado, para repetir un desafío ya resuelto.',
    inputSchema: { type: 'object', properties: { domain: { type: 'string' } } },
    handler: async ({ domain }) => {
      await attach();
      let host = domain;
      if (!host) {
        const href = await evaluate('location.href').catch(() => '');
        try { host = new URL(href).hostname; } catch { throw new Error(`no pude leer el dominio: ${href || 'vacío'}`); }
      }
      const count = (r) => {
        if (Array.isArray(r.cookies)) return r.cookies.length;
        return Object.values(r.splitByCookieStore ?? {}).reduce((n, s) => n + (s.cookies?.length ?? 0), 0);
      };
      const before = await call('storage.getCookies', { filter: { domain: host } });
      await call('storage.deleteCookies', { filter: { domain: host } });
      const after = await call('storage.getCookies', { filter: { domain: host } });
      return `${count(before)} cookies en ${host}, quedan ${count(after)}`;
    },
  },
  {
    name: 'type',
    description: 'Enfoca un elemento y escribe con eventos de teclado reales.',
    inputSchema: {
      type: 'object',
      properties: { target: { type: 'string' }, text: { type: 'string' }, submit: { type: 'boolean' } },
      required: ['target', 'text'],
    },
    handler: async ({ target, text, submit }) => {
      await attach();
      const ok = await evaluate(`(() => {
        let el = null;
        try { el = document.querySelector(${q(target)}); } catch {}
        if (!el) return false;
        el.focus();
        return document.activeElement === el || !!document.activeElement?.isContentEditable;
      })()`);
      if (!ok) throw new Error(`no pude enfocar: ${target}`);
      const actions = [];
      for (const ch of text) actions.push({ type: 'keyDown', value: ch }, { type: 'keyUp', value: ch });
      if (submit) actions.push({ type: 'keyDown', value: SPECIAL_KEYS.Enter }, { type: 'keyUp', value: SPECIAL_KEYS.Enter });
      await typeKeys(actions);
      return `${text.length} caracteres en ${target}${submit ? ' + Enter' : ''}`;
    },
  },
  {
    name: 'press',
    description: 'Tecla especial: Enter, Tab, Escape, ArrowDown, Backspace, PageDown, etc.',
    inputSchema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] },
    handler: async ({ key }) => {
      await attach();
      const v = SPECIAL_KEYS[key] ?? key;
      await typeKeys([{ type: 'keyDown', value: v }, { type: 'keyUp', value: v }]);
      return `tecla ${key}`;
    },
  },
  {
    name: 'preload',
    description: 'Inyecta un script que corre antes de cada carga (por defecto oculta navigator.webdriver).',
    inputSchema: { type: 'object', properties: { code: { type: 'string' } } },
    handler: async ({ code }) => {
      await attach();
      const decl = code ?? `() => {
        try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true }); } catch {}
      }`;
      const res = await call('script.addPreloadScript', { functionDeclaration: decl });
      return `preload ${res.script}`;
    },
  },
  {
    name: 'screenshot',
    description: 'Captura la pestaña actual a un PNG.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, fullPage: { type: 'boolean' } } },
    handler: async ({ path = '/tmp/firefox-shot.png', fullPage }) => {
      await attach();
      const ctx = await context();
      let restore = null;
      if (fullPage) {
        // Firefox clamps the clip to the viewport, so grow the viewport to the
        // document size first and shrink it back afterwards.
        const box = await evaluate(`({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })`);
        const target = { width: Math.ceil(box.width), height: Math.ceil(box.height) };
        restore = await evaluate('innerHeight');
        sendNoReply('browsingContext.setViewport', { context: ctx, viewport: target });
        await waitHeight(target.height);
      }
      let data;
      try {
        ({ data } = await call('browsingContext.captureScreenshot', { context: ctx }));
      } finally {
        if (fullPage) {
          sendNoReply('browsingContext.setViewport', { context: ctx, viewport: null });
          await waitHeight(restore, true);
        }
      }
      const buf = Buffer.from(data, 'base64');
      writeFileSync(path, buf);
      return `${path} (${buf.length} bytes)`;
    },
  },
  ...makeDocsTools({ call, evaluate, context, attach }),
];

// --------------------------------------------------------- MCP protocol

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const err = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    return ok(id, {
      protocolVersion: params?.protocolVersion ?? '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'firefox-bidi', version: '0.1.0' },
    });
  }
  if (method === 'tools/list') {
    return ok(id, { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
  }
  if (method === 'tools/call') {
    const tool = tools.find((t) => t.name === params?.name);
    if (!tool) return err(id, -32602, `herramienta desconocida: ${params?.name}`);
    try {
      const text = await tool.handler(params.arguments ?? {});
      return ok(id, { content: [{ type: 'text', text: String(text ?? '') }] });
    } catch (e) {
      return ok(id, { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true });
    }
  }
  if (method === 'ping') return ok(id, {});
  if (!id) return null;
  return err(id, -32601, `método no soportado: ${method}`);
}

// ------------------------------------------------------ stdio transport

let buf = '';
let inflight = 0;
let ended = false;
let queue = Promise.resolve();

const maybeExit = () => {
  if (ended && inflight === 0) {
    detach().finally(() => setTimeout(() => process.exit(0), 150));
  }
};

async function dispatch(line) {
  inflight++;
  try {
    const msg = JSON.parse(line);
    const out = await handle(msg);
    if (out) writeSync(1, JSON.stringify(out) + '\n');
  } catch {
    log('mensaje inválido:', line.slice(0, 200));
  } finally {
    inflight--;
    maybeExit();
  }
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (line) queue = queue.then(() => dispatch(line));
  }
});
process.stdin.on('end', () => { ended = true; maybeExit(); });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { ended = true; maybeExit(); });
