// Google Docs tools for the firefox MCP server.
//
// They hook into the MCP's single BiDi session: they receive call/evaluate/
// context/attach instead of opening their own session, because Firefox only
// allows one.
//
// Docs draws the document body on a canvas, so there are no text nodes to read
// or select. Everything here drives the real UI with trusted input events:
//
//   text      -> key events, one per character
//   caret     -> the in-app find bar (Ctrl+F)
//   styles    -> toolbar dropdown for "Título", Ctrl+Alt+1/2 for headings
//   tables    -> Insert > Table grid picker, Tab between cells
//   images    -> synthetic drag events carrying a File built in the page
import { readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const KEYS = {
  Ctrl: '\uE009', Shift: '\uE008', Alt: '\uE00A', Meta: '\uE03D',
  Enter: '\uE007', Tab: '\uE004', Escape: '\uE00C', Backspace: '\uE003', Delete: '\uE017',
  Space: '\u0020', ArrowLeft: '\uE012', ArrowUp: '\uE013', ArrowRight: '\uE014',
  ArrowDown: '\uE015', PageUp: '\uE00E', PageDown: '\uE00F', Home: '\uE011', End: '\uE010',
};

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp',
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Firefox downloads the export here; there is no way to read the tab instead,
// because Docs answers /export with a file and leaves the tab on about:blank.
const DOWNLOAD_DIR = process.env.FIREFOX_DOWNLOAD_DIR || join(homedir(), 'Downloads');

const recentTxt = () => {
  try {
    return readdirSync(DOWNLOAD_DIR)
      .filter((f) => f.endsWith('.txt'))
      .map((f) => {
        try { return { f, mtime: statSync(join(DOWNLOAD_DIR, f)).mtimeMs }; } catch { return null; }
      })
      .filter(Boolean);
  } catch { return []; }
};

const NORMALIZE_JS = `const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim();`;

export function makeDocsTools({ call, evaluate, context, attach }) {
  // ------------------------------------------------------ input primitives

  // Steps are a key name, or { key, mods }, or the literal 'pause'.
  const keyActions = (steps) => {
    const actions = [];
    for (const step of steps) {
      if (step === 'pause') { actions.push({ type: 'pause', duration: 60 }); continue; }
      const mods = typeof step === 'string' ? [] : step.mods || [];
      const key = typeof step === 'string' ? step : step.key;
      const value = KEYS[key] ?? key;
      for (const m of mods) actions.push({ type: 'keyDown', value: KEYS[m] });
      actions.push({ type: 'keyDown', value }, { type: 'keyUp', value });
      for (let i = mods.length - 1; i >= 0; i--) actions.push({ type: 'keyUp', value: KEYS[mods[i]] });
    }
    return actions;
  };

  const sendKeys = async (steps) => call('input.performActions', {
    context: await context(),
    actions: [{ type: 'key', id: 'kb', actions: keyActions(steps) }],
  });

  const typeText = (text) => sendKeys([...text]);

  const click = async (x, y) => call('input.performActions', {
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

  // --------------------------------------------------------- page lookups

  // Centre of the smallest visible element whose text matches, which is what
  // keeps us off full-width wrappers that contain the label.
  const rectFor = (text, exact) => `
(() => {
  ${NORMALIZE_JS}
  const want = ${JSON.stringify(text)};
  const nodes = [...document.querySelectorAll('div,span,button,[role="menuitem"],[role="option"],[role="button"],[role="listbox"]')];
  const vis = nodes.filter((n) => {
    const r = n.getBoundingClientRect();
    return r.width > 8 && r.height > 8 && r.top >= 0 && r.left >= 0;
  });
  const match = ${exact ? 'true' : 'false'}
    ? vis.filter((n) => norm(n.textContent) === want)
    : vis.filter((n) => norm(n.textContent).startsWith(want));
  const pick = match.sort((a, b) => {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return ra.width * ra.height - rb.width * rb.height;
  })[0];
  if (!pick) return null;
  const r = pick.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, tag: pick.tagName.toLowerCase() };
})()`;

  const clickText = async (text, exact = false) => {
    const where = await evaluate(rectFor(text, exact));
    if (!where) throw new Error(`no encontre "${text}" en pantalla`);
    await click(where.x, where.y);
    return where;
  };

  const editorPoint = (fraction) => `(() => {
    const ed = document.querySelector('.kix-appview-editor');
    if (!ed) return null;
    const r = ed.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height * ${fraction}) };
  })()`;

  // Click inside the page first: Docs only takes keys once the body has focus.
  const focusDoc = async (where = 'end') => {
    const box = await evaluate(editorPoint(0.05));
    if (!box) throw new Error('la pestana actual no es un documento de Google Docs');
    await click(box.x, box.y);
    await sleep(200);
    await sendKeys([{ key: where === 'start' ? 'Home' : 'End', mods: ['Ctrl'] }]);
    await sleep(100);
  };

  const clearDoc = async () => {
    await focusDoc('start');
    await sendKeys([{ key: 'a', mods: ['Ctrl'] }, 'pause', 'Backspace']);
    await sleep(250);
  };

  // Paragraph style through the toolbar dropdown; there is no shortcut for
  // "Título" (headings do have Ctrl+Alt+1..6).
  const setStyle = async (name) => {
    const btn = await evaluate(`(() => {
      ${NORMALIZE_JS}
      const vis = [...document.querySelectorAll('div,span,[role="button"],[role="listbox"]')];
      const cands = vis.filter((n) => {
        const r = n.getBoundingClientRect();
        return r.top >= 0 && r.top < 130 && r.width > 40 && r.height > 10
          && /^(Texto normal|Normal text|Título|Titulo|Title|Encabezado|Heading|Subtítulo)/i.test(norm(n.textContent));
      });
      const el = cands.sort((a, b) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return ra.width * ra.height - rb.width * rb.height;
      })[0];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);
    if (!btn) throw new Error('no encontre el selector de estilos');
    await click(btn.x, btn.y);
    await sleep(300);
    await clickText(name, true);
    await sleep(250);
  };

  // --------------------------------------------------------------- tables

  // Insert > Table opens a cell grid: cell (r,c) sits at
  // x = left + (c-1)*side, y = top + (r-1)*side.
  const insertTable = async (rows, cols) => {
    const menu = await evaluate(`(() => {
      ${NORMALIZE_JS}
      const el = [...document.querySelectorAll('[role="menuitem"]')]
        .find((n) => norm(n.innerText) === 'Insertar' || norm(n.innerText) === 'Insert');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);
    if (!menu) throw new Error('no encontre el menu Insertar');
    await click(menu.x, menu.y);
    await sleep(300);

    const item = await evaluate(`(() => {
      ${NORMALIZE_JS}
      const el = [...document.querySelectorAll('[role="menuitem"]')]
        .filter((n) => { const r = n.getBoundingClientRect(); return r.width > 60 && r.height > 12 && r.left > 60; })
        .find((n) => /^(Tabla|Table)\\b/.test(norm(n.innerText)));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width - 24, y: r.y + r.height / 2 };
    })()`);
    if (!item) throw new Error('no encontre la entrada Tabla');
    await click(item.x, item.y);
    await sleep(400);

    const grid = await evaluate(`(() => {
      const pick = document.querySelector('.goog-dimension-picker');
      if (!pick) return null;
      const cell = document.querySelector('.goog-dimension-picker-highlighted');
      const box = (cell || pick).getBoundingClientRect();
      const r = pick.getBoundingClientRect();
      const side = Math.round(box.width) || 18;
      return { x: r.x, y: r.y, side, cols: Math.round(r.width / side), rows: Math.round(r.height / side) };
    })()`);
    if (!grid) throw new Error('no aparecio el selector de tamano de tabla');
    const wantRows = Math.max(1, Math.min(rows, grid.rows));
    const wantCols = Math.max(1, Math.min(cols, grid.cols));
    await click(
      grid.x + (wantCols - 1) * grid.side + grid.side / 2,
      grid.y + (wantRows - 1) * grid.side + grid.side / 2,
    );
    await sleep(600);
    return { rows: wantRows, cols: wantCols, maxRows: grid.rows, maxCols: grid.cols };
  };

  // The "Opciones de la tabla" button is only in the toolbar while the caret
  // sits inside a table, which makes it a reliable position check.
  const cursorInTable = () => evaluate(`(() => {
    ${NORMALIZE_JS}
    return [...document.querySelectorAll('div,span')].some((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top < 130
        && /^(Opciones de la tabla|Table options)$/.test(norm(e.textContent));
    });
  })()`);

  // ArrowDown leaves the last cell, but Docs ignores it if it lands before the
  // reflow finishes, so retry until the table button goes away.
  const leaveTable = async () => {
    for (let i = 0; i < 5; i++) {
      await sleep(250);
      await sendKeys(['ArrowDown']);
      if (!(await cursorInTable())) return true;
    }
    throw new Error('no pude salir de la tabla (ArrowDown no movio el cursor)');
  };

  const fillTable = async (rows) => {
    const cols = Math.max(...rows.map((r) => r.length));
    const size = await insertTable(rows.length, cols);
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < cols; c++) {
        const text = rows[r][c] ?? '';
        if (text) await typeRich(text);
        const last = r === rows.length - 1 && c === cols - 1;
        // Tab on the last cell would append a row, so stop before it.
        if (!last) await sendKeys(['Tab']);
      }
    }
    await sleep(200);
    return `${size.rows}x${size.cols}`;
  };

  // --------------------------------------------------------------- images

  // No file dialog is reachable from BiDi and the system clipboard never makes
  // it into the page here, so build a File inside the page and drop it on the
  // editor. Docs accepts the drop; an anonymous session still refuses the
  // upload ("debes acceder a tu cuenta").
  const insertImage = async (path, { x, y } = {}) => {
    if (!path) throw new Error('falta path de la imagen');
    const size = statSync(path).size;
    if (size > MAX_IMAGE_BYTES) throw new Error(`imagen muy grande para inyectarla (${Math.round(size / 1048576)} MB)`);
    const name = path.split('/').pop();
    const ext = (name.split('.').pop() || '').toLowerCase();
    const mime = MIME[ext];
    if (!mime) throw new Error(`extension no soportada: .${ext}`);
    const b64 = readFileSync(path).toString('base64');
    const point = (Number.isFinite(x) && Number.isFinite(y)) ? { x, y } : await evaluate(editorPoint(1 / 3));
    if (!point) throw new Error('la pestana actual no es un documento de Google Docs');
    const res = await evaluate(`(() => {
      const bin = atob(${JSON.stringify(b64)});
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const file = new File([bytes], ${JSON.stringify(name)}, { type: ${JSON.stringify(mime)} });
      const dt = new DataTransfer();
      dt.items.add(file);
      const x = ${Math.round(point.x)}, y = ${Math.round(point.y)};
      const el = document.elementFromPoint(x, y) || document.querySelector('.kix-appview-editor');
      if (!el) return 'sin destino';
      const seen = [];
      for (const type of ['dragenter', 'dragover', 'drop']) {
        el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }));
        seen.push(type);
      }
      return seen.join(' ') + ' en ' + x + ',' + y + ' (' + ${JSON.stringify(name)} + ', ' + file.size + ' bytes)';
    })()`);
    await sleep(1200);
    return res;
  };

  // --------------------------------------------------------- caret / text

  // Caret placement goes through the in-app find bar: it types the needle,
  // cycles with Enter, closes with Escape and collapses onto the match.
  const findText = async (needle, { occurrence = 1, where = 'end' } = {}) => {
    if (!needle) throw new Error('falta el texto a buscar');
    await sendKeys([{ key: 'f', mods: ['Ctrl'] }]);
    await sleep(250);
    await sendKeys([...needle]);
    await sleep(500);
    for (let i = 1; i < occurrence; i++) {
      await sendKeys(['Enter']);
      await sleep(250);
    }
    await sendKeys(['Escape']);
    await sleep(200);
    if (where === 'end') await sendKeys(['ArrowRight']);
    else if (where === 'start') await sendKeys(['ArrowLeft']);
    else if (where !== 'select') throw new Error(`where invalido: ${where}`);
    await sleep(120);
    return `cursor en "${needle}" (${where})`;
  };

  // **bold** spans toggle Ctrl+B around the wrapped text.
  const typeRich = async (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/).filter((p) => p !== '');
    for (const part of parts) {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        await sendKeys([{ key: 'b', mods: ['Ctrl'] }]);
        await typeText(part.slice(2, -2));
        await sendKeys([{ key: 'b', mods: ['Ctrl'] }]);
      } else {
        await typeText(part);
      }
    }
  };

  // ----------------------------------------------------- spec and writer

  const parseSpec = (src) => {
    const blocks = [];
    for (const raw of src.split('\n')) {
      const line = raw.replace(/\s+$/, '');
      if (!line.trim()) continue;
      if (line.startsWith('### ')) blocks.push({ kind: 'h2', text: line.slice(4) });
      else if (line.startsWith('## ')) blocks.push({ kind: 'h1', text: line.slice(3) });
      else if (line.startsWith('# ')) blocks.push({ kind: 'title', text: line.slice(2) });
      else if (line.startsWith('- ')) blocks.push({ kind: 'bullet', text: line.slice(2) });
      else if (/^\d+\.\s/.test(line)) blocks.push({ kind: 'number', text: line.replace(/^\d+\.\s/, '') });
      else if (line.startsWith('---')) blocks.push({ kind: 'pagebreak' });
      else if (line.trim().startsWith('|')) {
        blocks.push({
          kind: 'row',
          cells: line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()),
        });
      } else blocks.push({ kind: 'p', text: line });
    }
    return blocks;
  };

  const writeDoc = async (blocks) => {
    let style = 'Texto normal';
    let list = null;

    const normalize = async (want) => {
      if (style === want) return;
      await setStyle(want);
      style = want;
    };

    // A single Enter only starts another item, it does not leave the list.
    const exitList = async () => {
      if (!list) return;
      await sendKeys(['Enter']);
      list = null;
    };

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];

      if (b.kind === 'row') {
        const rows = [];
        while (i < blocks.length && blocks[i].kind === 'row') rows.push(blocks[i++].cells);
        i--;
        await exitList();
        await normalize('Texto normal');
        await fillTable(rows);
        await leaveTable();
        continue;
      }

      if (b.kind === 'pagebreak') {
        await exitList();
        await sendKeys([{ key: 'Enter', mods: ['Ctrl'] }]);
        continue;
      }

      if (b.kind === 'bullet' || b.kind === 'number') {
        await normalize('Texto normal');
        if (list !== b.kind) {
          if (list) await exitList();
          await sendKeys([{ key: b.kind === 'bullet' ? '8' : '7', mods: ['Ctrl', 'Shift'] }]);
          list = b.kind;
        }
        await typeRich(b.text);
        await sendKeys(['Enter']);
        continue;
      }

      await exitList();

      if (b.kind === 'title') {
        await setStyle('Título');
        style = 'Título';
        await typeRich(b.text);
        await sendKeys(['Enter']);
        style = 'Texto normal';
        continue;
      }

      if (b.kind === 'h1' || b.kind === 'h2') {
        await sendKeys([{ key: b.kind === 'h1' ? '1' : '2', mods: ['Ctrl', 'Alt'] }]);
        style = b.kind === 'h1' ? 'Encabezado 1' : 'Encabezado 2';
        await typeRich(b.text);
        await sendKeys(['Enter']);
        continue;
      }

      await normalize('Texto normal');
      await typeRich(b.text);
      await sendKeys(['Enter']);
    }

    if (list) await sendKeys(['Enter']);
    await sleep(600);
    return blocks.length;
  };

  // Export the document to txt and read the downloaded file. The download tab
  // stays on about:blank, so the file is the only source of truth. The file is
  // deleted after reading so ~/Downloads does not fill with copies.
  const readDoc = async () => {
    const id = await evaluate(`(() => { const m = location.href.match(/document\\/d\\/([\\w-]+)/); return m ? m[1] : ''; })()`);
    if (!id) throw new Error('la pestana actual no es un documento de Google Docs');

    const before = new Map(recentTxt().map((x) => [x.f, x.mtime]));
    const tab = await call('browsingContext.create', { type: 'tab', background: true });
    try {
      await call('browsingContext.navigate', {
        context: tab.context,
        url: `https://docs.google.com/document/d/${id}/export?format=txt`,
        wait: 'none',
      }).catch(() => {});
    } finally {
      try { await call('browsingContext.close', { context: tab.context }); } catch {}
    }

    let file = null;
    const deadline = Date.now() + 12000;
    while (!file && Date.now() < deadline) {
      await sleep(250);
      const fresh = recentTxt().filter((x) => !before.has(x.f) || before.get(x.f) !== x.mtime);
      if (fresh.length) file = fresh.sort((a, b) => b.mtime - a.mtime)[0];
    }
    if (!file) throw new Error(`la exportacion no dejo un .txt en ${DOWNLOAD_DIR} (¿sesion sin cuenta?)`);

    const path = join(DOWNLOAD_DIR, file.f);
    const text = readFileSync(path, 'utf8');
    try { unlinkSync(path); } catch {}
    return text;
  };

  // Compact state check: whitespace collapsed, empty lines dropped, one line
  // per paragraph or table row. Cheaper than a screenshot for verification.
  const checkDoc = async () => {
    const text = await readDoc();
    const lines = text.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean);
    const body = lines.join(' | ');
    return `${lines.length} lineas, ${body.length} chars: ${body}`;
  };

  // ---------------------------------------------------------------- tools

  return [
    {
      name: 'docs',
      description: 'Edita un documento de Google Docs abierto. action=focus (caret al inicio o al final), cursor (mueve el cursor o selecciona el texto de find; where=start|end|select, occurrence=N para la N-esima coincidencia), clear (borra todo), write (limpia y escribe la especificacion), insert (escribe al final sin limpiar), read (texto exportado del documento, via descarga a ~/Downloads), check (resumen compacto en una linea para verificar el estado, mas barato que un screenshot), status. La especificacion es markdown minimo: "# Titulo" (estilo Titulo), "## Seccion" (Encabezado 1), "### Subseccion" (Encabezado 2), "- vinetas", "1. numerada", "---" salto de pagina, texto suelto = parrafo normal. Admite **negritas** y tablas: filas consecutivas con formato "| a | b |" (maximo 5 filas por el selector de Docs). action=text escribe en el caret sin Enter. action=image inserta una imagen local (path, opcional x/y del punto de suelte).',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['status', 'focus', 'clear', 'write', 'insert', 'text', 'image', 'read', 'check', 'cursor'] },
          spec: { type: 'string' },
          find: { type: 'string' },
          path: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          occurrence: { type: 'number' },
          where: { type: 'string', enum: ['start', 'end', 'select'] },
        },
        required: ['action'],
      },
      handler: async ({ action, spec, where, find, occurrence, path, x, y }) => {
        await attach();

        if (action === 'status') {
          return evaluate(`(() => {
            const ed = !!document.querySelector('.kix-appview-editor');
            return document.title + ' | ' + location.href + (ed ? ' | docs: si' : ' | docs: no');
          })()`);
        }
        if (action === 'focus') {
          await focusDoc(where === 'start' ? 'start' : 'end');
          return `caret al ${where === 'start' ? 'inicio' : 'final'}`;
        }
        if (action === 'clear') {
          await clearDoc();
          return 'documento vacio';
        }
        if (action === 'read') return readDoc();
        if (action === 'check') return checkDoc();
        if (action === 'text') { await typeRich(spec || ''); return 'texto escrito'; }
        if (action === 'image') return insertImage(path, { x, y });
        if (action === 'cursor') return findText(find, { occurrence: occurrence || 1, where: where || 'end' });

        const blocks = parseSpec(spec || '');
        if (!blocks.length) throw new Error('especificacion vacia');
        if (action === 'write') await clearDoc();
        const n = await writeDoc(blocks);
        return `${action === 'write' ? 'documento escrito' : 'texto agregado'}: ${n} bloques`;
      },
    },
    {
      name: 'key',
      description: 'Pulsacion con modificadores: "Ctrl+Alt+1" (encabezado 1), "Ctrl+Shift+8" (vinetas), "Ctrl+A", "Ctrl+B". Sin modificador tambien acepta Enter, Tab, Backspace, ArrowDown, etc.',
      inputSchema: { type: 'object', properties: { combo: { type: 'string' } }, required: ['combo'] },
      handler: async ({ combo }) => {
        await attach();
        const parts = combo.split('+').map((s) => s.trim()).filter(Boolean);
        const key = parts.pop();
        await sendKeys([{ key, mods: parts }]);
        return 'tecla ' + combo;
      },
    },
  ];
}
