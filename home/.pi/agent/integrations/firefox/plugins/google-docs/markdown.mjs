// Markdown -> blocks of styled spans, typed into Docs with real key events.
// Docs has no API here, so only keyboard-reachable constructs are modelled.

const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const HR = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const PAGEBREAK = /^\s*(?:\\pagebreak|:::pagebreak|<!--\s*pagebreak\s*-->)\s*$/i;

const ALIGN_ROW = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
const hasPipe = (line) => line.includes('|');

const clean = (text) => text.replace(/\\([\\`*_{}[\]()#+\-.!>~|<])/g, '$1');

function merge(tokens) {
  const out = [];
  for (const token of tokens) {
    if (!token.text) continue;
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.bold === token.bold &&
      prev.italic === token.italic &&
      prev.strike === token.strike &&
      prev.code === token.code &&
      prev.underline === token.underline &&
      prev.link === token.link
    ) {
      prev.text += token.text;
    } else {
      out.push({ ...token });
    }
  }
  return out;
}

const findClose = (text, from, marker) => {
  let at = text.indexOf(marker, from);
  while (at !== -1) {
    if (!/\s/.test(text[at - 1] || '')) return at;
    at = text.indexOf(marker, at + marker.length);
  }
  return -1;
};

// styles: { bold, italic, strike, code, underline, link }
export function parseInline(src, styles = {}) {
  const text = String(src ?? '');
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const rest = text.slice(i);
    let m;

    if ((m = /^\\([\\`*_{}[\]()#+\-.!>~|<])/.exec(rest))) {
      tokens.push({ ...styles, text: m[1] });
      i += m[0].length;
      continue;
    }

    if ((m = /^`+([\s\S]*?)`+/.exec(rest))) {
      tokens.push({ ...styles, text: m[1].trim(), code: true });
      i += m[0].length;
      continue;
    }

    if ((m = /^\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/.exec(rest))) {
      tokens.push(...parseInline(m[1], { ...styles, link: m[2] }));
      i += m[0].length;
      continue;
    }

    if ((m = /^<((?:https?:\/\/|mailto:)[^>\s]+)>/.exec(rest))) {
      tokens.push({ ...styles, text: m[1], link: m[1] });
      i += m[0].length;
      continue;
    }

    if ((m = /^<u>([\s\S]*?)<\/u>/i.exec(rest))) {
      tokens.push(...parseInline(m[1], { ...styles, underline: true }));
      i += m[0].length;
      continue;
    }

    if ((m = /^<\/?(?:b|i|u|s|em|strong|span|mark|sub|sup|code|br)[^>]*>/i.exec(rest))) {
      i += m[0].length;
      continue;
    }

    if (rest.startsWith('***') || rest.startsWith('___')) {
      const marker = rest.slice(0, 3);
      const end = findClose(text, i + 3, marker);
      if (end > i + 3) {
        tokens.push(...parseInline(text.slice(i + 3, end), { ...styles, bold: true, italic: true }));
        i = end + 3;
        continue;
      }
    }

    if (rest.startsWith('~~')) {
      const end = findClose(text, i + 2, '~~');
      if (end > i + 2) {
        tokens.push(...parseInline(text.slice(i + 2, end), { ...styles, strike: true }));
        i = end + 2;
        continue;
      }
    }

    if (rest.startsWith('**') || rest.startsWith('__')) {
      const marker = rest.slice(0, 2);
      const prevChar = text[i - 1] || '';
      if (!(marker === '__' && /[A-Za-z0-9]/.test(prevChar))) {
        const end = findClose(text, i + 2, marker);
        if (end > i + 2) {
          tokens.push(...parseInline(text.slice(i + 2, end), { ...styles, bold: true }));
          i = end + 2;
          continue;
        }
      }
    }

    if (rest[0] === '*' || rest[0] === '_') {
      const marker = rest[0];
      const intraword = marker === '_' && /[A-Za-z0-9]/.test(text[i - 1] || '');
      if (!intraword) {
        const end = findClose(text, i + 1, marker);
        if (end > i + 1) {
          tokens.push(...parseInline(text.slice(i + 1, end), { ...styles, italic: true }));
          i = end + 1;
          continue;
        }
      }
    }

    tokens.push({ ...styles, text: text[i] });
    i++;
  }

  return merge(tokens);
}

const splitRow = (line) => {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells = [];
  let cur = '';
  let inCode = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && s[i + 1] === '|') {
      cur += '|';
      i++;
      continue;
    }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) {
      cells.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
};

export function parseMarkdown(src) {
  let text = String(src ?? '').replace(/\r\n?/g, '\n');
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (front) text = text.slice(front[0].length);

  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (PAGEBREAK.test(line)) {
      blocks.push({ type: 'pagebreak' });
      i++;
      continue;
    }
    if (!trimmed) {
      i++;
      continue;
    }

    const fence = /^ {0,3}(```+|~~~+)\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      const marker = fence[1][0].repeat(3);
      const code = [];
      i++;
      while (i < lines.length && !new RegExp(`^ {0,3}${marker}`).test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push({ type: 'code', lang: fence[2] || '', lines: code });
      continue;
    }

    const heading = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, spans: parseInline(heading[2]) });
      i++;
      continue;
    }

    if (i + 1 < lines.length && /^ {0,3}=+\s*$/.test(lines[i + 1]) && trimmed) {
      blocks.push({ type: 'heading', level: 1, spans: parseInline(trimmed) });
      i += 2;
      continue;
    }
    if (i + 1 < lines.length && /^ {0,3}-+\s*$/.test(lines[i + 1]) && trimmed && !HR.test(line)) {
      blocks.push({ type: 'heading', level: 2, spans: parseInline(trimmed) });
      i += 2;
      continue;
    }

    if (HR.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    if (/^ {0,3}>/.test(line)) {
      const quoted = [];
      while (i < lines.length && /^ {0,3}>/.test(lines[i])) {
        quoted.push(lines[i].replace(/^ {0,3}>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'paragraph', spans: parseInline(quoted.join(' ')) });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const items = [];
      while (i < lines.length) {
        const m = LIST_ITEM.exec(lines[i]);
        if (m) {
          const indent = m[1].replace(/\t/g, '    ').length;
          let content = m[3];
          const task = /^\[([ xX])\]\s+(.*)$/.exec(content);
          items.push({
            indent,
            ordered: /\d/.test(m[2]),
            task: task ? task[1].toLowerCase() === 'x' : undefined,
            spans: parseInline(task ? task[2] : content),
          });
          i++;
          continue;
        }
        if (!lines[i].trim()) break;
        if (/^\s{2,}/.test(lines[i]) && items.length) {
          const last = items[items.length - 1];
          last.spans = parseInline(`${last.spans.map((s) => s.text).join('')} ${lines[i].trim()}`);
          i++;
          continue;
        }
        break;
      }
      const base = Math.min(...items.map((it) => it.indent));
      for (const item of items) {
        blocks.push({
          type: 'list',
          ordered: item.ordered,
          task: item.task,
          level: Math.max(0, Math.round((item.indent - base) / 2)),
          spans: item.spans,
        });
      }
      continue;
    }

    const formulaBlock = /^ {0,3}\$\$(.+?)\$\$\s*$/.exec(line);
    if (formulaBlock) {
      blocks.push({ type: 'formula', latex: formulaBlock[1] });
      i++;
      continue;
    }

    const imageBlock = /^ {0,3}!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)\s*$/.exec(line);
    if (imageBlock) {
      blocks.push({ type: 'image', url: imageBlock[2], caption: imageBlock[1] });
      i++;
      continue;
    }

    if (hasPipe(line) && i + 1 < lines.length && ALIGN_ROW.test(lines[i + 1]) && hasPipe(lines[i + 1])) {
      const rows = [splitRow(line).map((cell) => parseInline(cell))];
      i += 2;
      while (i < lines.length && lines[i].trim() && hasPipe(lines[i])) {
        rows.push(splitRow(lines[i++]).map((cell) => parseInline(cell)));
      }
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }

    const para = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i];
      if (!next.trim()) break;
      if (
        PAGEBREAK.test(next) ||
        /^ {0,3}(#{1,6})\s+/.test(next) ||
        HR.test(next) ||
        LIST_ITEM.test(next) ||
        /^ {0,3}>/.test(next) ||
        /^ {0,3}(```+|~~~+)/.test(next) ||
        (hasPipe(next) && i + 1 < lines.length && ALIGN_ROW.test(lines[i + 1]))
      )
        break;
      para.push(next);
      i++;
    }
    blocks.push({ type: 'paragraph', spans: parseInline(para.map((l) => l.trimEnd()).join(' ')) });
  }

  return blocks;
}

export const plain = (spans) => spans.map((s) => s.text).join('');
