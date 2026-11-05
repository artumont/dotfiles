import { ENDPOINT, CALL_TIMEOUT, log } from './config.mjs';

let ws = null;
let ctxId = null;
let nextId = 1;
let attaching = null;
const pending = new Map();

export const getContextId = () => ctxId;
export const setContextId = (id) => {
  ctxId = id;
};
export const resetContext = () => {
  ctxId = null;
};

function send(method, params) {
  return new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      log(`timeout ${method} (${CALL_TIMEOUT} ms)`);
      resolve({ id, type: 'error', error: 'timeout', message: `${method} sin respuesta` });
    }, CALL_TIMEOUT);
    pending.set(id, (reply) => {
      clearTimeout(timer);
      resolve(reply);
    });
    try {
      ws.send(JSON.stringify({ id, method, params }));
    } catch (err) {
      pending.delete(id);
      clearTimeout(timer);
      resolve({ id, type: 'error', error: 'socket', message: String(err?.message || err) });
    }
  });
}

export async function call(method, params) {
  const reply = await send(method, params);
  if (reply?.type === 'error') {
    let msg = `${method}: ${reply.error}${reply.message ? ': ' + reply.message : ''}`;
    if (/Maximum number of active sessions/i.test(`${reply.error} ${reply.message || ''}`)) {
      msg += ' (Firefox ya tiene una sesión BiDi abierta; reinícialo con firefox-agent)';
    }
    throw new Error(msg);
  }
  return reply.result;
}

// Firefox never answers setViewport, so nothing may await its reply.
export function sendNoReply(method, params) {
  const id = nextId++;
  pending.set(id, () => {});
  try {
    ws.send(JSON.stringify({ id, method, params }));
  } catch {
    pending.delete(id);
  }
}

export async function attach() {
  if (ws && ws.readyState === 1) return;
  if (attaching) return attaching;
  attaching = (async () => {
    const sock = new WebSocket(ENDPOINT);
    await new Promise((resolve, reject) => {
      sock.addEventListener('open', resolve, { once: true });
      sock.addEventListener(
        'error',
        () => reject(new Error(`no pude conectar a ${ENDPOINT}: abre Firefox con firefox-agent`)),
        { once: true },
      );
    });
    ws = sock;
    sock.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
      } catch {
        return;
      }
      if (msg?.id == null) return;
      const resolve = pending.get(msg.id);
      if (!resolve) return;
      pending.delete(msg.id);
      resolve(msg);
    });
    sock.addEventListener('close', () => {
      ws = null;
      ctxId = null;
    });
    try {
      await call('session.new', { capabilities: {} });
    } catch (err) {
      ws = null;
      try {
        sock.close();
      } catch {}
      throw err;
    }
  })().finally(() => {
    attaching = null;
  });
  return attaching;
}

export async function detach() {
  if (!ws || ws.readyState !== 1) {
    ws = null;
    ctxId = null;
    return;
  }
  try {
    await call('session.end', {});
  } catch {}
  try {
    ws.close();
  } catch {}
  ws = null;
  ctxId = null;
}
