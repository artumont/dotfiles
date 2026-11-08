// Google Docs plugin for the firefox MCP.
//
// Keyboard only: no pointer events and no clipboard. Content is typed with real
// key events, menu commands come from the tool finder (Alt+/), and the document
// is read back through the export endpoint (no clipboard, no text scraping of
// the canvas editor).
import { makeDocs } from './actions.mjs';

let instance = null;
let instanceApi = null;
const docsFor = (api) => {
  if (instanceApi !== api) {
    instanceApi = api;
    instance = makeDocs(api);
  }
  return instance;
};

const schema = (properties = {}, required = []) => ({
  type: 'object',
  properties,
  ...(required.length ? { required } : {}),
  additionalProperties: false,
});

export default {
  name: 'docs',
  description: 'Google Docs via the browser, keyboard only: markdown writing, tables, comments, export.',
  tools: [
    {
      name: 'status',
      description: 'Url, docId, title, editor ready and signed-in state of the current tab.',
      inputSchema: schema(),
      async handler(_args, api) {
        return JSON.stringify(await docsFor(api).status(), null, 2);
      },
    },
    {
      name: 'login',
      description:
        'Opens accounts.google.com. Sign in by hand once; the Agente profile keeps the session, so no API token or OAuth client is involved.',
      inputSchema: schema(),
      handler: (_args, api) => docsFor(api).login(),
    },
    {
      name: 'open',
      description: 'Opens a document by url or id in the current tab and waits for the editor.',
      inputSchema: schema({
        url: { type: 'string', description: 'Full docs.google.com url.' },
        id: { type: 'string', description: 'Id from /document/d/<id>/edit.' },
      }),
      async handler(args, api) {
        return JSON.stringify(await docsFor(api).open(args), null, 2);
      },
    },
    {
      name: 'new',
      description: 'Creates a blank document (signed-in session required) and optionally renames it.',
      inputSchema: schema({ title: { type: 'string' } }),
      async handler(args, api) {
        return JSON.stringify(await docsFor(api).createDoc(args), null, 2);
      },
    },
    {
      name: 'read',
      description:
        'Reads the whole document by downloading its export (no clipboard): markdown (native .md export, falls back to html), text, or html.',
      inputSchema: schema({ format: { type: 'string', enum: ['markdown', 'text', 'html'] } }),
      handler: ({ format = 'markdown' } = {}, api) => docsFor(api).read({ format }),
    },
    {
      name: 'write',
      description:
        'Types markdown into the document with real key events: #..###### headings, paragraphs, **bold**, *italic*, <u>underline</u>, ~~strike~~, links, nested bullet/numbered/checklists, pipe tables, --- rules, page breaks (\\pagebreak) and fenced code (as plain lines). mode=replace clears the document first; append/prepend start at the end/beginning; cursor types at the caret.',
      inputSchema: schema(
        { markdown: { type: 'string' }, mode: { type: 'string', enum: ['replace', 'append', 'prepend', 'cursor'] } },
        ['markdown'],
      ),
      handler: ({ markdown, mode = 'replace' } = {}, api) => docsFor(api).writeMarkdown(markdown, { mode }),
    },
    {
      name: 'format',
      description:
        'Inline formatting for the selection, or for find text when find is given: bold, italic, underline, strike, super/subscript, clear, alignment and links (Ctrl+K).',
      inputSchema: schema({
        bold: { type: 'boolean' },
        italic: { type: 'boolean' },
        underline: { type: 'boolean' },
        strike: { type: 'boolean' },
        superscript: { type: 'boolean' },
        subscript: { type: 'boolean' },
        clear: { type: 'boolean' },
        align: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
        link: { type: 'string' },
        find: { type: 'string', description: 'Select this text first.' },
        occurrence: { type: 'number' },
        where: { type: 'string', enum: ['select', 'start', 'end'] },
      }),
      handler: (args, api) => docsFor(api).format(args),
    },
    {
      name: 'style',
      description: 'Paragraph style: normal, title, subtitle or h1..h6 (headings via Ctrl+Alt+N, title/subtitle via the tool finder).',
      inputSchema: schema(
        { style: { type: 'string', enum: ['normal', 'title', 'subtitle', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] } },
        ['style'],
      ),
      handler: ({ style } = {}, api) => docsFor(api).style(style),
    },
    {
      name: 'list',
      description: 'Turns the paragraph into a bullet, numbered or checklist item; level indents (negative outdents).',
      inputSchema: schema({
        kind: { type: 'string', enum: ['bullet', 'number', 'checklist', 'none'], description: 'Default bullet.' },
        level: { type: 'number' },
      }),
      handler: (args, api) => docsFor(api).list(args),
    },
    {
      name: 'table',
      description:
        'Inserts a table through the tool finder and fills it cell by cell with Tab: data (array of rows or "a|b\\nc|d") or rows x cols. action edits the table at the caret (or at find): row_above, row_below, col_left, col_right, delete_row, delete_col, merge, unmerge.',
      inputSchema: schema({
        action: { type: 'string', enum: ['row_above', 'row_below', 'col_left', 'col_right', 'delete_row', 'delete_col', 'merge', 'unmerge'] },
        rows: { type: 'number', description: 'Default 3.' },
        cols: { type: 'number', description: 'Default 3.' },
        data: { description: 'Array of arrays, or pipe separated lines.' },
        find: { type: 'string', description: 'For row/column edits: caret into this text first.' },
        occurrence: { type: 'number' },
      }),
      handler: (args, api) => (args?.action ? docsFor(api).tableAction(args) : docsFor(api).insertTable(args)),
    },
    {
      name: 'image',
      description:
        'Inserts an image at the caret: a public url (fetched by Google) or a local path (pushed in as a synthetic drop, no file picker). caption adds an italic line. In write, ![caption](url-or-path) does the same.',
      inputSchema: schema({
        url: { type: 'string', description: 'Public image url.' },
        path: { type: 'string', description: 'Local image path.' },
        caption: { type: 'string' },
      }),
      handler: (args, api) => docsFor(api).insertImage(args),
    },
    {
      name: 'formula',
      description:
        'Renders LaTeX to a PNG locally (pdflatex + ImageMagick), inserts it at the caret and deletes the temp file. In write, a line with $$latex$$ does the same.',
      inputSchema: schema({ latex: { type: 'string' }, caption: { type: 'string' } }, ['latex']),
      async handler({ latex, caption } = {}, api) {
        const docs = docsFor(api);
        return docs.insertFormula({ latex, caption });
      },
    },
    {
      name: 'comment',
      description: 'Adds a comment with Ctrl+Alt+M; quote selects the anchored text first.',
      inputSchema: schema(
        { text: { type: 'string' }, quote: { type: 'string' }, occurrence: { type: 'number' } },
        ['text'],
      ),
      handler: (args, api) => docsFor(api).comment(args),
    },
    {
      name: 'copy',
      description:
        'Duplicates the current document through File > Make a copy, optionally renaming the copy, and leaves the copy open in the tab. Returns the new docId and url.',
      inputSchema: schema({
        title: { type: 'string', description: 'Name for the copy; defaults to "Copy of <title>".' },
      }),
      async handler(args, api) {
        return JSON.stringify(await docsFor(api).copyDoc(args), null, 2);
      },
    },
    {
      name: 'replace',
      description: 'Find and replace through the Docs panel (Ctrl+H).',
      inputSchema: schema({ find: { type: 'string' }, replace: { type: 'string' }, all: { type: 'boolean' } }, ['find']),
      handler: (args, api) => docsFor(api).replace(args),
    },
    {
      name: 'export',
      description: 'Downloads the current document as pdf, docx, odt, rtf, txt, html (zip), epub or md and returns the path.',
      inputSchema: schema({
        format: { type: 'string', enum: ['pdf', 'docx', 'odt', 'rtf', 'txt', 'html', 'epub', 'md'], description: 'Default pdf.' },
        path: { type: 'string' },
      }),
      handler: (args, api) => docsFor(api).exportDoc(args),
    },
    {
      name: 'rename',
      description: 'Renames the document through the title field.',
      inputSchema: schema({ title: { type: 'string' } }, ['title']),
      handler: ({ title } = {}, api) => docsFor(api).rename(title),
    },
    {
      name: 'find',
      description: 'Moves the caret to (or selects) the n-th match of a text using the in-app find bar.',
      inputSchema: schema(
        {
          text: { type: 'string' },
          occurrence: { type: 'number', description: 'Default 1.' },
          where: { type: 'string', enum: ['select', 'start', 'end'], description: 'Default select.' },
        },
        ['text'],
      ),
      handler: ({ text, occurrence = 1, where = 'select' } = {}, api) =>
        docsFor(api).selectText(text, { occurrence, where }),
    },
    {
      name: 'tabs',
      description: 'Lists, opens, switches or closes browser tabs.',
      inputSchema: schema({
        action: { type: 'string', enum: ['list', 'new', 'switch', 'close'], description: 'Default list.' },
        index: { type: 'number' },
        url: { type: 'string' },
      }),
      handler: ({ action = 'list', index = 0, url } = {}, api) => docsFor(api).tabs(action, index, url),
    },
    {
      name: 'key',
      description: 'Escape hatch: presses a key combo such as "Ctrl+Alt+1", "Ctrl+Shift+8" or "Escape".',
      inputSchema: schema({ combo: { type: 'string' } }, ['combo']),
      handler: (args, api) => docsFor(api).rawKey(args),
    },
    {
      name: 'type',
      description: 'Escape hatch: types raw text with real key events at the current focus.',
      inputSchema: schema({ text: { type: 'string' } }, ['text']),
      handler: (args, api) => docsFor(api).rawType(args),
    },
    {
      name: 'eval',
      description: 'Escape hatch: evaluates JavaScript in the current tab and returns the JSON result.',
      inputSchema: schema({ expression: { type: 'string' } }, ['expression']),
      handler: (args, api) => docsFor(api).rawEval(args),
    },
    {
      name: 'selftest',
      description:
        'Checks the keyboard path on the open document: tool finder commands, markdown export read (no clipboard, no pointer).',
      inputSchema: schema(),
      handler: (_args, api) => docsFor(api).selfTest(),
    },
  ],
};
