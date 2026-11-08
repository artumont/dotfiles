import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseInline, parseMarkdown, plain } from './markdown.mjs';
import { htmlToMarkdown, htmlToPlain } from './html2md.mjs';
import { zipText } from './zip.mjs';

const DOWNLOAD_DIR = process.env.GOOGLE_DOCS_DOWNLOAD_DIR || join(homedir(), 'Downloads');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms)),
  ]);

const EDITOR_INFO = `(() => {
  const ed = document.querySelector('.kix-appview-editor');
  const title = document.querySelector('.docs-title-input');
  const url = location.href;
  const id = (url.match(/\\/document\\/d\\/([a-zA-Z0-9_-]+)/) || [])[1] || null;
  return {
    url,
    docId: id,
    title: title ? title.value || title.textContent : document.title,
    editor: !!ed,
    signedIn: !/accounts\\.google\\.com/.test(url) && /docs\\.google\\.com\\/document/.test(url),
    signin: /accounts\\.google\\.com/.test(url),
  };
})()`;

const OMNIBOX_ROWS = `(() => [...document.querySelectorAll('.docs-omnibox-autocomplete .ac-row')]
  .filter((n) => n.offsetParent !== null)
  .map((n) => (n.innerText || '').replace(/\\s+/g, ' ').trim())
  .filter(Boolean))()`;

const IMAGE_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  avif: 'image/avif',
};

const FORMULA_DIR = join(tmpdir(), 'google-docs-formulas');

function renderFormula(latex, { dpi = 360, maxWidth = 460 } = {}) {
  mkdirSync(FORMULA_DIR, { recursive: true });
  const base = join(FORMULA_DIR, `f${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const tex = `${base}.tex`;
  const body = String(latex).trim().replace(/^\$\$?|\$\$?$/g, '');
  writeFileSync(
    tex,
    [
      '\\documentclass[border=2pt]{standalone}',
      '\\usepackage{amsmath,amssymb}',
      '\\begin{document}',
      `$\\displaystyle ${body}$`,
      '\\end{document}',
      '',
    ].join('\n'),
  );
  try {
    execFileSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', tex], { cwd: FORMULA_DIR, stdio: 'ignore' });
    const pdf = `${base}.pdf`;
    const png = `${base}.png`;
    execFileSync(
      'convert',
      ['-density', String(dpi), pdf, '-background', 'white', '-alpha', 'remove', '-trim', '+repage', png],
      { stdio: 'ignore' },
    );
    const width = Number(execFileSync('identify', ['-format', '%w', png]).toString()) || 0;
    if (width > maxWidth) execFileSync('convert', [png, '-resize', `${maxWidth}x`, png], { stdio: 'ignore' });
    return png;
  } catch (err) {
    throw new Error(`latex render failed: ${err?.message ?? err}`);
  }
}

const EXPORT_EXT = { md: '.md', txt: '.txt', html: '.zip', pdf: '.pdf', docx: '.docx', odt: '.odt', rtf: '.rtf', epub: '.epub' };

const LIST_KEYS = { bullet: '8', number: '7', checklist: '9' };

export function makeDocs(api) {
  const state = {};

  async function boot() {
    await api.attach();
    // the landing page at /document/u/0/ is not an editor; if the session points
    // at it, move to a real document tab
    const url = await api.evaluate('location.href');
    if (!/docs\.google\.com\/document\/d\//.test(url)) {
      const { contexts = [] } = await api.call('browsingContext.getTree', { maxDepth: 1 });
      const doc = contexts.find((c) => /docs\.google\.com\/document\/d\//.test(c.url || ''));
      if (doc) api.use?.(doc.context);
    }
    return true;
  }

  async function info() {
    await boot();
    state.info = await api.evaluate(EDITOR_INFO);
    return state.info;
  }

  async function requireDoc() {
    const current = await info();
    if (!current.editor) {
      if (current.signin) throw new Error('not signed in to Google; run docs_login and sign in once in this profile');
      throw new Error(`the active tab is not a Google Docs editor (${current.url})`);
    }
    return current;
  }

  // Focus the hidden text target the editor listens on, no pointer involved.
  async function focusOnly() {
    await api.evaluate(`(() => {
      const frame = document.querySelector('.docs-texteventtarget-iframe');
      if (!frame) return false;
      frame.focus();
      try {
        const doc = frame.contentDocument;
        const body = doc && (doc.body || doc.documentElement);
        if (body) { body.tabIndex = -1; body.focus(); }
      } catch {}
      return true;
    })()`);
    await sleep(150);
  }

// Local images are pushed into the editor as a synthetic drop carrying a File,
// which is how Docs' own upload takes them: no file picker, no clipboard.
async function caretPoint() {
  return api.evaluate(`(() => {
    const caret = document.querySelector('.kix-cursor');
    if (caret) {
      const r = caret.getBoundingClientRect();
      if (r.x || r.y) return { x: Math.round(r.x), y: Math.round(r.y + 6) };
    }
    const ed = document.querySelector('.kix-appview-editor');
    if (!ed) return null;
    const r = ed.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height * 0.4) };
  })()`);
}

async function insertLocalImage(path, caption) {
  const size = statSync(path).size;
  if (size > 8 * 1024 * 1024) throw new Error('image too large to inject (max 8 MB)');
  const ext = (path.split('.').pop() || '').toLowerCase();
  const mime = IMAGE_MIME[ext] || 'application/octet-stream';
  const b64 = readFileSync(path).toString('base64');
  const point = await caretPoint();
  if (!point) throw new Error('not on a docs editor');

  await api.evaluate(`(() => {
    const bin = atob(${JSON.stringify(b64)});
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], ${JSON.stringify(path.split('/').pop())}, { type: ${JSON.stringify(mime)} });
    const dt = new DataTransfer();
    dt.items.add(file);
    const x = ${point.x}, y = ${point.y};
    const el = document.elementFromPoint(x, y) || document.querySelector('.kix-appview-editor');
    if (!el) return false;
    for (const type of ['dragenter', 'dragover', 'drop']) {
      el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }));
    }
    return true;
  })()`);

  // Docs uploads small files in a couple of seconds; verifying through an export
  // here would hammer the document, so wait instead.
  await sleep(2800);

  await focusOnly();
  await api.keys(['Enter']);
  await sleep(150);
  if (caption) {
    await api.keys([{ key: 'i', mods: ['Ctrl'] }]);
    await api.text(caption);
    await api.keys([{ key: 'i', mods: ['Ctrl'] }, 'pause', 'Enter']);
  }
  return `local image inserted (${path.split('/').pop()}, ${size} bytes)`;
}

  async function focusDoc(where = 'end') {
    await focusOnly();
    if (where === 'start' || where === 'end') {
      await api.keys([{ key: where === 'start' ? 'Home' : 'End', mods: ['Ctrl'] }]);
      await sleep(120);
    }
  }

  // ---- tool finder (Alt+/): the keyboard path to every menu command -------

  async function openOmnibox(query) {
    await api.keys([{ key: '/', mods: ['Alt'] }]);
    await sleep(300);
    await api.keys([{ key: 'a', mods: ['Ctrl'] }]);
    await api.text(query);
    await sleep(420);
  }

  async function omniboxActive() {
    return api.evaluate(`(() => {
      const rows = [...document.querySelectorAll('.docs-omnibox-autocomplete .ac-row')];
      return rows.findIndex((row) => row.classList.contains('ac-active'));
    })()`);
  }

  async function omniboxRows() {
    for (let i = 0; i < 8; i++) {
      const rows = await api.evaluate(OMNIBOX_ROWS);
      if (Array.isArray(rows) && rows.length) return rows;
      await sleep(180);
    }
    return [];
  }

  async function findCommand(query, matcher) {
    await openOmnibox(query);
    const rows = await omniboxRows();
    const index = rows.findIndex((label) => matcher.test(label));
    await api.keys(['Escape']);
    await sleep(120);
    return index === -1 ? null : { index, label: rows[index], rows };
  }

  async function runCommand(query, matcher, { keepFocus = false } = {}) {
    await openOmnibox(query);
    const rows = await omniboxRows();
    const index = rows.findIndex((label) => matcher.test(label));
    if (index === -1) {
      await api.keys(['Escape']);
      throw new Error(`command not available: ${query} (options: ${rows.slice(0, 5).join(' | ') || 'none'})`);
    }
    const active = await omniboxActive();
    const from = active < 0 ? 0 : active;
    for (let i = from; i < index; i++) await api.keys(['ArrowDown']);
    for (let i = from; i > index; i--) await api.keys(['ArrowUp']);
    await api.keys(['Enter']);
    await sleep(600);
    if (!keepFocus) await focusOnly();
    return rows[index];
  }

  // ---- typing -------------------------------------------------------------

  async function typeSpans(spans) {
    for (const span of spans) {
      if (!span.text) continue;
      const toggles = [];
      if (span.bold) toggles.push({ key: 'b', mods: ['Ctrl'] });
      if (span.italic) toggles.push({ key: 'i', mods: ['Ctrl'] });
      if (span.underline) toggles.push({ key: 'u', mods: ['Ctrl'] });
      if (span.strike) toggles.push({ key: '5', mods: ['Alt', 'Shift'] });

      for (const toggle of toggles) await api.keys([toggle]);

      if (span.link) {
        await api.text(span.text);
        const chars = Math.min(400, [...span.text].length);
        if (chars) await api.keys(Array.from({ length: chars }, () => ({ key: 'ArrowLeft', mods: ['Shift'] })));
        await api.keys([{ key: 'k', mods: ['Ctrl'] }]);
        await sleep(350);
        await api.text(span.link);
        await sleep(150);
        await api.keys(['Enter']);
        await sleep(250);
      } else {
        await api.text(span.text);
      }

      for (const toggle of toggles.reverse()) await api.keys([toggle]);
    }
  }

  async function setHeading(level) {
    if (level >= 1 && level <= 6) {
      await api.keys([{ key: String(level), mods: ['Ctrl', 'Alt'] }]);
      await sleep(220);
    }
  }

  // Enter on an empty item ends a list; outdent first so a nested item does not
  // leave the outer list open (changing the type would restyle every item).
  async function exitList(current) {
    for (let i = 0; i < (current.level || 0); i++) {
      await api.keys([{ key: 'Tab', mods: ['Shift'] }]);
    }
    await api.keys(['Enter', 'pause', 'Enter']);
    await sleep(150);
  }

  async function setList(kind, level, current) {
    if (current.kind !== kind) {
      await api.keys([{ key: LIST_KEYS[kind], mods: ['Ctrl', 'Shift'] }]);
      await sleep(300);
    }
    const delta = (level || 0) - (current.level || 0);
    for (let i = 0; i < Math.abs(delta); i++) {
      await api.keys([delta > 0 ? 'Tab' : { key: 'Tab', mods: ['Shift'] }]);
      await sleep(200);
    }
    return { kind, level: level || 0 };
  }

  // ---- images -------------------------------------------------------------

  const URL_FIELD = `[...document.querySelectorAll('input')].find((i) => /picker-urlview-inner-input/.test(String(i.className)))`;

  async function imageField() {
    return api.evaluate(`(() => {
      const field = ${URL_FIELD};
      if (!field) return null;
      field.focus();
      return { value: field.value, focused: document.activeElement === field };
    })()`);
  }

  async function waitImageField(timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const field = await imageField();
      if (field?.focused) return field;
      await sleep(250);
    }
    return null;
  }

  async function cancelImageDialog() {
    await api.evaluate(`(() => {
      const btn = [...document.querySelectorAll('button,[role="button"]')].find(
        (b) => b.offsetParent !== null && /^(CANCELAR|CANCEL)$/i.test((b.innerText || '').trim()),
      );
      if (btn) btn.click();
      return !!btn;
    })()`);
  }

  async function insertFormula({ latex, caption } = {}) {
    await requireDoc();
    await focusDoc('cursor');
    if (!latex) throw new Error('missing latex');
    const png = renderFormula(latex);
    try {
      return await insertLocalImage(png, caption);
    } finally {
      try {
        rmSync(png, { force: true });
      } catch {}
    }
  }

  async function insertImage({ url, path, caption } = {}) {
    await requireDoc();
    await focusDoc('cursor');
    const local = path || (url && !/^(https?:|data:)/i.test(url) ? url : null);
    if (local) return insertLocalImage(local, caption);
    if (!url) throw new Error('image needs a url or a local path');

    await runCommand('insertar imagen mediante url', /^Insertar imagen mediante URL$/i, { keepFocus: true });
    const field = await waitImageField();
    if (!field) {
      await cancelImageDialog();
      throw new Error('the Insert image dialog did not focus its url field');
    }

    await api.text(url);
    await sleep(300);
    const value = await imageField();
    if (value?.value !== url) {
      await cancelImageDialog();
      throw new Error('could not type the url into the image dialog');
    }

    // Enter validates the url and enables the insert button
    await api.keys(['Enter']);
    await sleep(600);

    let clicked = false;
    for (let i = 0; i < 60; i++) {
      clicked = await api.evaluate(`(() => {
        const btn = [...document.querySelectorAll('button,[role="button"]')].find(
          (b) => b.offsetParent !== null && /^(INSERTAR IMAGEN|INSERT IMAGE)$/i.test((b.innerText || '').trim()),
        );
        if (!btn) return false;
        if (btn.getAttribute('aria-disabled') === 'true' || btn.disabled) return false;
        btn.click();
        return true;
      })()`);
      if (clicked) break;
      await sleep(500);
    }
    if (!clicked) {
      await cancelImageDialog();
      throw new Error('the image url did not validate (Google could not fetch it)');
    }

    const deadline = Date.now() + 15000;
    const hidden = () =>
      api.evaluate(`(() => { const f = ${URL_FIELD}; return !f || f.offsetParent === null; })()`);
    while (Date.now() < deadline) {
      if (await hidden()) break;
      await sleep(400);
    }
    if (!(await hidden())) throw new Error('the image dialog stayed open; image not inserted');

    await sleep(800);
    await focusOnly();
    await api.keys(['Enter']);
    await sleep(150);
    if (caption) {
      await api.keys([{ key: 'i', mods: ['Ctrl'] }]);
      await api.text(caption);
      await api.keys([{ key: 'i', mods: ['Ctrl'] }, 'pause', 'Enter']);
    }
    return `image inserted${caption ? ' with caption' : ''}`;
  }

  // ---- tables -------------------------------------------------------------

  async function insertTable({ rows = 3, cols = 3, data } = {}) {
    await requireDoc();
    let grid = null;
    let height = Math.max(1, Number(rows) || 1);
    let width = Math.max(1, Number(cols) || 1);

    if (data) {
      const raw = Array.isArray(data) ? data : String(data).split('\n').map((line) => line.split('|').map((c) => c.trim()));
      grid = raw.map((row) => row.map((cell) => (Array.isArray(cell) ? cell : parseInline(String(cell ?? '')))));
      height = Math.max(1, grid.length);
      width = Math.max(1, ...grid.map((row) => row.length));
    }

    await focusDoc('end');
    await runCommand('insertar tabla', /^Insertar tabla/i);
    await sleep(400);

    for (let c = 2; c < width; c++) {
      await runCommand('insertar columna a la derecha', /^Insertar columna a la derecha$/i);
    }

    // Adding a column leaves the caret in the new column; the table-navigation
    // command puts it back in the first cell.
    if (width > 2) await runCommand('ir al principio de la tabla', /^Ir al principio de la tabla/i);

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const spans = grid ? grid[r][c] || [] : [];
        if (spans.length) await typeSpans(spans);
        const last = r === height - 1 && c === width - 1;
        if (!last) await api.keys(['Tab']);
      }
    }

    // ArrowDown from the last cell leaves the table; otherwise the next block
    // would be typed inside it.
    await api.keys(['ArrowDown']);
    await sleep(200);

    return `${height}x${width} table inserted`;
  }

  async function tableAction({ action, find, occurrence = 1 } = {}) {
    await requireDoc();
    const labels = {
      row_above: [/^Insertar fila encima$/i, 'insertar fila encima'],
      row_below: [/^Insertar fila debajo$/i, 'insertar fila debajo'],
      col_left: [/^Insertar columna a la izquierda$/i, 'insertar columna a la izquierda'],
      col_right: [/^Insertar columna a la derecha$/i, 'insertar columna a la derecha'],
      delete_row: [/^Eliminar fila$/i, 'eliminar fila'],
      delete_col: [/^Eliminar columna$/i, 'eliminar columna'],
      merge: [/^Combinar celdas$/i, 'combinar celdas'],
      unmerge: [/^Dividir celdas$/i, 'dividir celdas'],
    };
    const entry = labels[action];
    if (!entry) throw new Error(`action must be one of ${Object.keys(labels).join(', ')}`);
    if (find) await selectText(find, { occurrence, where: 'end' });
    const label = await runCommand(entry[1], entry[0]);
    return `table ${action}: ${label}`;
  }

  // ---- markdown writing ---------------------------------------------------

  async function writeMarkdown(md, { mode = 'replace' } = {}) {
    await requireDoc();
    const blocks = parseMarkdown(md);
    if (!blocks.length) throw new Error('empty markdown');

    await focusDoc(mode === 'prepend' ? 'start' : 'end');
    if (mode === 'replace') {
      await api.keys([{ key: 'a', mods: ['Ctrl'] }, 'pause', 'Backspace']);
      await sleep(300);
    } else if (mode === 'append') {
      // the caret lands at the end of the last paragraph; start a fresh one
      await api.keys(['Enter']);
      await sleep(120);
    } else if (mode === 'prepend') {
      await api.keys(['Enter', 'ArrowUp']);
      await sleep(120);
    } else if (mode !== 'cursor') {
      throw new Error('mode must be replace, append, prepend or cursor');
    }

    let list = { kind: null, level: 0 };

    for (const block of blocks) {
      if (list.kind && block.type !== 'list') {
        await exitList(list);
        list = { kind: null, level: 0 };
      }

      if (block.type === 'heading') {
        await setHeading(block.level);
        await typeSpans(block.spans);
        await api.keys(['Enter']);
      } else if (block.type === 'paragraph') {
        await typeSpans(block.spans);
        await api.keys(['Enter']);
      } else if (block.type === 'code') {
        for (const line of block.lines) {
          await api.text(line);
          await api.keys(['Enter']);
        }
      } else if (block.type === 'list') {
        const kind = block.task !== undefined ? 'checklist' : block.ordered ? 'number' : 'bullet';
        if (list.kind && list.kind !== kind) {
          await exitList(list);
          list = { kind: null, level: 0 };
        }
        list = await setList(kind, block.level, list);
        await typeSpans(block.spans);
        await api.keys(['Enter']);
      } else if (block.type === 'hr') {
        await runCommand('insertar línea horizontal', /^Insertar línea horizontal$/i);
      } else if (block.type === 'pagebreak') {
        await api.keys([{ key: 'Enter', mods: ['Ctrl'] }]);
      } else if (block.type === 'table') {
        await insertTable({ data: block.rows.map((row) => row) });
      } else if (block.type === 'image') {
        await insertImage({ url: block.url, caption: block.caption });
      } else if (block.type === 'formula') {
        const png = renderFormula(block.latex);
        try {
          await insertLocalImage(png, block.caption);
        } finally {
          try {
            rmSync(png, { force: true });
          } catch {}
        }
      }
      await sleep(220);
    }

    if (list.kind) await exitList(list);

    return `typed ${blocks.length} block(s) from ${md.length} chars`;
  }

  // ---- reading through the export endpoint (no clipboard) -----------------

  const listFiles = (dir = DOWNLOAD_DIR) => {
    try {
      return readdirSync(dir)
        .map((name) => {
          try {
            const st = statSync(join(dir, name));
            return { name, path: join(dir, name), size: st.size, mtime: st.mtimeMs };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  // temporary=true keeps the export out of the user's Downloads folder: when the
  // browser honors setDownloadBehavior it lands in a tmpdir, and if it does not,
  // the file is moved there right after it appears.
  async function download(format, { temporary = false } = {}) {
    const current = await requireDoc();
    if (!current.docId) throw new Error('no document id in the current url');
    const ext = EXPORT_EXT[format];
    if (!ext) throw new Error(`format must be one of ${Object.keys(EXPORT_EXT).join(', ')}`);

    const tempDir = temporary ? mkdtempSync(join(tmpdir(), 'google-docs-')) : null;
    const seen = new Set(
      [...listFiles(DOWNLOAD_DIR), ...(tempDir ? listFiles(tempDir) : [])].map((f) => f.path),
    );
    const { context } = await api.call('browsingContext.create', { type: 'tab' });

    if (tempDir) {
      try {
        await api.call('browsingContext.setDownloadBehavior', {
          context,
          behavior: 'allowed',
          downloadPath: tempDir,
        });
      } catch {}
    }

    try {
      await api.call('browsingContext.navigate', {
        context,
        url: `https://docs.google.com/document/d/${current.docId}/export?format=${format}`,
        wait: 'complete',
      });
      const dirs = tempDir ? [tempDir, DOWNLOAD_DIR] : [DOWNLOAD_DIR];
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        await sleep(500);
        for (const dir of dirs) {
          const fresh = listFiles(dir).filter(
            (f) => !seen.has(f.path) && f.name.endsWith(ext) && !f.name.endsWith('.crdownload'),
          );
          if (!fresh.length) continue;
          const file = fresh.sort((a, b) => b.mtime - a.mtime)[0];
          await sleep(200);
          let path = file.path;
          let originPath = null;
          if (tempDir && dir !== tempDir) {
            const moved = join(tempDir, file.name);
            try {
              renameSync(file.path, moved);
              path = moved;
            } catch {
              try {
                copyFileSync(file.path, moved);
                unlinkSync(file.path);
                path = moved;
              } catch {
                originPath = file.path;
              }
            }
          }
          return { ...file, path, originPath, tempDir };
        }
      }
      throw new Error(
        `no ${format} download appeared (looked in ${tempDir ? `${tempDir} and ` : ''}${DOWNLOAD_DIR})`,
      );
    } finally {
      try {
        await api.call('browsingContext.close', { context });
      } catch {}
    }
  }

  async function withTemporaryDownload(format, fn) {
    const started = Date.now();
    const file = await download(format, { temporary: true });
    try {
      return await fn(file);
    } finally {
      try {
        rmSync(file.path, { force: true });
      } catch {}
      if (file.originPath) {
        try {
          rmSync(file.originPath, { force: true });
        } catch {}
      }
      // a slow download can land in the download folder after the move
      await sleep(900);
      for (const leftover of listFiles(DOWNLOAD_DIR)) {
        if (leftover.mtime >= started && leftover.name.endsWith(EXPORT_EXT[format])) {
          try {
            rmSync(leftover.path, { force: true });
          } catch {}
        }
      }
      if (file.tempDir) {
        try {
          rmSync(file.tempDir, { recursive: true, force: true });
        } catch {}
      }
    }
  }

  async function read({ format = 'markdown' } = {}) {
    if (format === 'text' || format === 'txt') {
      return withTemporaryDownload('txt', (file) => readFileSync(file.path, 'utf8'));
    }
    if (format === 'html') {
      return withTemporaryDownload('html', (file) => zipText(readFileSync(file.path)));
    }
    if (format !== 'markdown' && format !== 'md') throw new Error('format must be markdown, text or html');

    const md = (await withTemporaryDownload('md', (file) => readFileSync(file.path, 'utf8'))).trim();
    if (md) return md;
    return withTemporaryDownload('html', (file) => htmlToMarkdown(zipText(readFileSync(file.path))));
  }

  // ---- selection and formatting -------------------------------------------

  async function openFindBar() {
    // Firefox takes Ctrl+F for its own find bar, so use Docs' panel instead.
    try {
      await runCommand('buscar en el documento', /^Buscar en el documento/i, { keepFocus: true });
    } catch {
      await api.keys([{ key: 'f', mods: ['Ctrl'] }]);
    }
    for (let i = 0; i < 25; i++) {
      const state = await api.evaluate(`(() => {
        const field = [...document.querySelectorAll('input')].find(
          (input) => input.offsetParent !== null && /buscar|find/i.test(input.getAttribute('aria-label') || ''),
        );
        if (!field) return null;
        field.focus();
        return { focused: document.activeElement === field };
      })()`);
      if (state?.focused) return true;
      await sleep(200);
    }
    return false;
  }

  async function selectText(needle, { occurrence = 1, where = 'select' } = {}) {
    if (!needle) throw new Error('missing find text');
    await boot();
    await focusOnly();
    if (!(await openFindBar())) throw new Error('the find bar did not take focus');

    await api.text(String(needle));
    await sleep(400);
    for (let i = 1; i < (Number(occurrence) || 1); i++) {
      await api.keys(['Enter']);
      await sleep(220);
    }
    await api.keys(['Escape']);
    await sleep(200);
    await focusOnly();

    if (where === 'select') {
      await api.keys(['ArrowLeft']);
      await sleep(80);
      await api.keys(Array.from({ length: Math.min(400, [...String(needle)].length) }, () => ({ key: 'ArrowRight', mods: ['Shift'] })));
    } else if (where === 'end') {
      await api.keys(['ArrowRight']);
    } else if (where === 'start') {
      await api.keys(['ArrowLeft']);
    } else {
      throw new Error('where must be start, end or select');
    }
    await sleep(120);
    return `caret on "${needle}" (${where})`;
  }

  async function format(ops = {}) {
    await requireDoc();
    if (ops.find) await selectText(ops.find, ops);
    const steps = [];
    const applied = [];
    const add = (label, step) => {
      steps.push(step);
      applied.push(label);
    };
    if (ops.bold) add('bold', { key: 'b', mods: ['Ctrl'] });
    if (ops.italic) add('italic', { key: 'i', mods: ['Ctrl'] });
    if (ops.underline) add('underline', { key: 'u', mods: ['Ctrl'] });
    if (ops.strike) add('strike', { key: '5', mods: ['Alt', 'Shift'] });
    if (ops.superscript) add('superscript', { key: '.', mods: ['Ctrl'] });
    if (ops.subscript) add('subscript', { key: ',', mods: ['Ctrl'] });
    if (ops.clear) add('clear', { key: '\\', mods: ['Ctrl'] });
    const align = String(ops.align || '').toLowerCase();
    if (align) {
      const key = { left: 'l', center: 'e', right: 'r', justify: 'j' }[align];
      if (!key) throw new Error('align must be left, center, right or justify');
      add(`align ${align}`, { key, mods: ['Ctrl', 'Shift'] });
    }
    if (!steps.length && !ops.link) throw new Error('nothing to format');
    if (steps.length) await api.keys(steps);
    if (ops.link) {
      await api.keys([{ key: 'k', mods: ['Ctrl'] }]);
      await sleep(350);
      await api.text(ops.link);
      await sleep(150);
      await api.keys(['Enter']);
      applied.push('link');
    }
    await sleep(150);
    return applied.join(', ');
  }

  async function style(styleName) {
    await requireDoc();
    const level = /^h([1-6])$/i.exec(String(styleName || ''));
    if (level) {
      await focusDoc('cursor');
      await setHeading(Number(level[1]));
      return `style h${level[1]}`;
    }
    const key = String(styleName || 'normal').toLowerCase();
    if (key === 'normal') {
      await focusDoc('cursor');
      await api.keys([{ key: '0', mods: ['Ctrl', 'Alt'] }]);
      return 'style normal';
    }
    const label = key === 'title' ? /^Título$/i : key === 'subtitle' ? /^Subtítulo$/i : null;
    if (!label) throw new Error('style must be normal, title, subtitle or h1..h6');
    await focusDoc('cursor');
    const hit = await runCommand(key === 'title' ? 'título' : 'subtítulo', label);
    return `style ${key}: ${hit}`;
  }

  async function list({ kind = 'bullet', level = 0 } = {}) {
    await requireDoc();
    const want = String(kind || 'bullet').toLowerCase();
    if (want === 'none') {
      await api.keys([{ key: '8', mods: ['Ctrl', 'Shift'] }]);
      return 'bullet list toggled';
    }
    if (!LIST_KEYS[want]) throw new Error('kind must be bullet, number, checklist or none');
    await api.keys([{ key: LIST_KEYS[want], mods: ['Ctrl', 'Shift'] }]);
    await sleep(150);
    for (let i = 0; i < Math.abs(Number(level) || 0); i++) {
      await api.keys([level > 0 ? 'Tab' : { key: 'Tab', mods: ['Shift'] }]);
    }
    return `${want} list${level ? ` level ${level}` : ''}`;
  }

  async function replace({ find, replace: withText, all = true } = {}) {
    if (!find) throw new Error('missing find');
    await requireDoc();
    await focusDoc();
    await api.keys([{ key: 'h', mods: ['Ctrl'] }]);
    await sleep(500);
    await api.text(find);
    await sleep(200);
    await api.keys(['Tab']);
    await sleep(150);
    if (withText) await api.text(withText);
    await sleep(200);
    await api.keys(['Enter']);
    await sleep(300);
    if (all) {
      for (let i = 0; i < 40; i++) {
        await api.keys(['Enter']);
        await sleep(120);
      }
    }
    await api.keys(['Escape']);
    return `replaced "${find}"${withText ? ` with "${withText}"` : ''}${all ? ' (repeat enter)' : ''}`;
  }

  async function comment({ text, quote, occurrence = 1 } = {}) {
    if (!text) throw new Error('missing comment text');
    await requireDoc();
    if (quote) await selectText(quote, { occurrence, where: 'select' });
    await api.keys([{ key: 'm', mods: ['Ctrl', 'Alt'] }]);
    await sleep(700);
    await api.text(text);
    await sleep(300);
    await api.keys(['Tab', 'Enter']);
    await sleep(500);
    return `comment added${quote ? ` on "${quote}"` : ''}`;
  }

  // ---- document lifecycle -------------------------------------------------

  async function status() {
    return info();
  }

  async function open({ url, id }) {
    await boot();
    const target = url || (id ? `https://docs.google.com/document/d/${id}/edit` : null);
    if (!target) throw new Error('open needs url or id');
    await api.navigate(target);
    for (let i = 0; i < 60; i++) {
      const current = await api.evaluate(EDITOR_INFO);
      if (current.editor) return current;
      if (current.signin) throw new Error('not signed in to Google; run docs_login and sign in once in this profile');
      await sleep(500);
    }
    throw new Error(`document did not load: ${await api.evaluate('location.href')}`);
  }

  async function login() {
    await boot();
    await api.navigate('https://accounts.google.com/');
    return 'sign in in the Firefox window; the Agente profile keeps the session (no token, no OAuth client)';
  }

  async function createDoc({ title } = {}) {
    await boot();
    await api.navigate('https://docs.google.com/document/create');
    for (let i = 0; i < 70; i++) {
      const current = await api.evaluate(EDITOR_INFO);
      if (current.editor) {
        if (title) await rename(title);
        return info();
      }
      if (current.signin) throw new Error('not signed in to Google; run docs_login and sign in once in this profile');
      await sleep(500);
    }
    throw new Error('the new document did not open');
  }

  async function copyDoc({ title } = {}) {
    const current = await requireDoc();
    const before = new Set(
      ((await api.call('browsingContext.getTree', { maxDepth: 1 })).contexts || []).map((c) => c.context),
    );
    await focusOnly();
    await runCommand('hacer una copia', /^Hacer una copia$/i, { keepFocus: true });

    // the dialog carries its own name field, prefilled with "Copy of <title>"
    let field = null;
    for (let i = 0; i < 25; i++) {
      const state = await api.evaluate(`(() => {
        const input = [...document.querySelectorAll('input[type="text"]')].find(
          (el) => el.offsetParent !== null && /Copia de |Copy of /i.test(el.value),
        );
        if (!input) return null;
        input.focus();
        input.select();
        return { focused: document.activeElement === input, value: input.value };
      })()`);
      if (state?.focused) {
        field = state;
        break;
      }
      await sleep(200);
    }
    if (!field) {
      await api.evaluate(`(() => {
        const btn = [...document.querySelectorAll('button,[role="button"]')].find(
          (b) => b.offsetParent !== null && /^(Cancelar|Cancel)$/i.test((b.innerText || '').trim()),
        );
        if (btn) btn.click();
        return !!btn;
      })()`);
      throw new Error('the copy dialog did not open');
    }

    if (title) {
      await api.keys([{ key: 'a', mods: ['Ctrl'] }, 'pause', 'Backspace']);
      await api.text(title);
      await sleep(200);
    }

    const clicked = await api.evaluate(`(() => {
      const btn = [...document.querySelectorAll('button,[role="button"]')].find(
        (b) => b.offsetParent !== null && /^(Hacer una copia|Make a copy)$/i.test((b.innerText || '').trim()),
      );
      if (!btn) return false;
      btn.click();
      return true;
    })()`);
    if (!clicked) throw new Error('the copy dialog has no confirm button');

    // Docs opens the copy in a new tab, so look for a document tab that was not
    // there before and point the session at it.
    let copyId = null;
    let copyContext = null;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      await sleep(700);
      const here = await api.evaluate(EDITOR_INFO);
      if (here.docId && here.docId !== current.docId && here.editor) {
        copyId = here.docId;
        break;
      }
      const contexts = (await api.call('browsingContext.getTree', { maxDepth: 1 })).contexts || [];
      const fresh = contexts.find(
        (c) => !before.has(c.context) && /docs\.google\.com\/document\/d\//.test(c.url || ''),
      );
      if (fresh) {
        copyContext = fresh.context;
        copyId = (String(fresh.url).match(/\/document\/d\/([a-zA-Z0-9_-]+)/) || [])[1] || null;
        break;
      }
    }
    if (!copyId) throw new Error('the copy did not open in a new tab');

    if (copyContext) api.use?.(copyContext);
    await sleep(1200);
    const info = await api.evaluate(EDITOR_INFO);
    return {
      url: info.url || (await api.evaluate('location.href')),
      docId: info.docId || copyId,
      title: info.title,
      source: current.docId,
      name: title || field.value,
      tab: copyContext ? 'new' : 'reused',
    };
  }

  async function rename(title) {
    await requireDoc();
    await runCommand('cambiar nombre', /^Cambiar nombre/i);

    // never send Ctrl+A unless the title input really has focus: otherwise the
    // shortcut selects the whole document and the next Backspace wipes it.
    let focused = false;
    for (let i = 0; i < 20; i++) {
      focused = await api.evaluate(`document.activeElement === document.querySelector('.docs-title-input')`);
      if (focused) break;
      await sleep(200);
    }
    if (!focused) throw new Error('the rename field did not take focus; document left untouched');

    await api.keys([{ key: 'a', mods: ['Ctrl'] }, 'pause', 'Backspace']);
    await api.text(title);
    await api.keys(['Enter']);
    for (let i = 0; i < 12; i++) {
      await sleep(300);
      if ((await info()).title === title) return `renamed to ${title}`;
    }
    const current = await info();
    return current.title === title ? `renamed to ${title}` : `rename pending, title is "${current.title}"`;
  }

  async function exportDoc({ format = 'pdf', path } = {}) {
    const file = await download(format);
    if (path) {
      const { renameSync } = await import('node:fs');
      renameSync(file.path, path);
      return `exported ${format} to ${path} (${file.size} bytes)`;
    }
    return `exported ${format} to ${file.path} (${file.size} bytes)`;
  }

  async function tabs(action = 'list', index = 0, url) {
    await boot();
    const { contexts = [] } = await api.call('browsingContext.getTree', { maxDepth: 1 });
    if (action === 'list') return contexts.map((c, i) => `${i}: ${c.url}`).join('\n') || '(no tabs)';
    if (action === 'new') {
      const { context } = await api.call('browsingContext.create', { type: 'tab' });
      if (url) await api.call('browsingContext.navigate', { context, url, wait: 'complete' });
      api.use?.(context);
      return `new tab ${url || 'about:blank'}`;
    }
    const target = contexts[index];
    if (!target) throw new Error(`no tab ${index}`);
    if (action === 'switch') {
      api.use?.(target.context);
      await api.call('browsingContext.activate', { context: target.context });
      return `focused ${target.url}`;
    }
    if (action === 'close') {
      await api.call('browsingContext.close', { context: target.context });
      api.use?.(null);
      return 'closed';
    }
    throw new Error('action must be list, new, switch or close');
  }

  async function ensureDocFocus() {
    const active = await api.evaluate(`(() => {
      const a = document.activeElement;
      return { tag: a ? a.tagName : '', cls: String((a && a.className) || '') };
    })()`);
    if (/^(INPUT|TEXTAREA)$/.test(active.tag) || /picker|urlview|dialog/i.test(active.cls)) return;
    await focusOnly();
  }

  async function rawKey({ combo } = {}) {
    await boot();
    if (!combo) throw new Error('missing combo');
    await ensureDocFocus();
    const parts = String(combo).split('+').map((p) => p.trim()).filter(Boolean);
    const key = parts.pop();
    await api.keys([{ key, mods: parts }]);
    return `key ${combo}`;
  }

  async function rawType({ text } = {}) {
    await boot();
    await ensureDocFocus();
    await api.text(String(text ?? ''));
    return `typed ${[...String(text ?? '')].length} chars`;
  }

  async function rawEval({ expression } = {}) {
    await boot();
    if (!expression) throw new Error('missing expression');
    return JSON.stringify(await api.evaluate(expression));
  }

  // Keyboard-only roundtrip: type into a scratch doc? No, use the open doc's
  // export to prove read, and the tool finder to prove commands.
  async function selfTest() {
    return withTimeout(
      (async () => {
        const current = await requireDoc();
        const commands = [];
        for (const [query, matcher] of [
          ['insertar tabla', /^Insertar tabla/i],
          ['insertar línea horizontal', /^Insertar línea horizontal$/i],
        ]) {
          const hit = await findCommand(query, matcher);
          commands.push({ query, found: !!hit, label: hit?.label });
        }
        const file = await download('md', { temporary: true });
        try {
          return JSON.stringify(
            { docId: current.docId, commands, readBytes: file.size, temporary: !!file.tempDir },
            null,
            2,
          );
        } finally {
          try {
            rmSync(file.path, { force: true });
          } catch {}
          if (file.tempDir) {
            try {
              rmSync(file.tempDir, { recursive: true, force: true });
            } catch {}
          }
        }
      })(),
      45000,
      'selftest',
    );
  }

  return {
    status,
    open,
    login,
    createDoc,
    read,
    writeMarkdown,
    rename,
    copyDoc,
    style,
    format,
    list,
    replace,
    comment,
    insertTable,
    tableAction,
    insertImage,
    insertFormula,
    exportDoc,
    tabs,
    rawKey,
    rawType,
    rawEval,
    selectText,
    selfTest,
  };
}

export const helpers = { parseInline, parseMarkdown, plain, htmlToMarkdown, htmlToPlain };
