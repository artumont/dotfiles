const VOID = new Set(['br', 'img', 'hr', 'meta', 'link', 'input', 'wbr', 'col', 'area', 'base', 'source', 'track', 'embed', 'param']);
const BLOCK = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'dt', 'dd', 'fieldset', 'figcaption',
  'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol',
  'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 'body', 'html',
]);

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', mdash: '\u2014', ndash: '\u2013',
  hellip: '\u2026', copy: '\u00a9', reg: '\u00ae', trade: '\u2122', bull: '\u2022', middot: '\u00b7',
  check: '\u2713', cross: '\u2717', laquo: '\u00ab', raquo: '\u00bb', lsquo: '\u2018', rsquo: '\u2019',
  ldquo: '\u201c', rdquo: '\u201d', deg: '\u00b0', plusmn: '\u00b1', times: '\u00d7', divide: '\u00f7',
  frac12: '\u00bd', frac14: '\u00bc', frac34: '\u00be', szlig: '\u00df', eacute: '\u00e9', ensp: ' ',
  emsp: ' ', thinsp: ' ', zwj: '\u200d', zwnj: '\u200c', larr: '\u2190', rarr: '\u2192', uarr: '\u2191',
  darr: '\u2193', harr: '\u2194', spades: '\u2660', clubs: '\u2663', hearts: '\u2665', diams: '\u2666',
};

export const decodeEntities = (s) =>
  String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (all, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : all;
    }
    return ENTITIES[body] ?? all;
  });

const parseAttrs = (src) => {
  const attrs = {};
  const re = /([\w:-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
  let m;
  while ((m = re.exec(src))) {
    let value = m[2] ?? '';
    if (/^["']/.test(value)) value = value.slice(1, -1);
    attrs[m[1].toLowerCase()] = decodeEntities(value);
  }
  return attrs;
};

const TOKEN =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/?([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*?)(\/?)>/g;

const AUTO_CLOSE = {
  p: new Set(['p']),
  li: new Set(['li']),
  tr: new Set(['tr', 'td', 'th']),
  td: new Set(['td', 'th']),
  th: new Set(['td', 'th']),
  dt: new Set(['dt', 'dd']),
  dd: new Set(['dt', 'dd']),
  option: new Set(['option']),
};

export function parseHtml(src) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  let last = 0;
  let m;

  const pushText = (text) => {
    if (!text) return;
    top().children.push({ type: 'text', text: decodeEntities(text) });
  };

  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(src))) {
    pushText(src.slice(last, m.index));
    last = TOKEN.lastIndex;

    if (m[0].startsWith('<!')) continue;

    const name = (m[1] || '').toLowerCase();
    const closing = m[0].startsWith('</');
    if (!name) continue;

    if (closing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === name) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const auto = AUTO_CLOSE[name];
    while (auto && stack.length > 1 && auto.has(top().tag)) stack.pop();

    const node = { tag: name, attrs: parseAttrs(m[2] || ''), children: [] };
    top().children.push(node);
    if (!VOID.has(name) && !m[3]) stack.push(node);
  }
  pushText(src.slice(last));
  return root.children;
}

const styleMap = (style) => {
  const map = {};
  for (const part of String(style || '').split(';')) {
    const at = part.indexOf(':');
    if (at === -1) continue;
    map[part.slice(0, at).trim().toLowerCase()] = part.slice(at + 1).trim().toLowerCase();
  }
  return map;
};

const isMono = (map, attrs) => {
  const family = map['font-family'] || '';
  if (/mono|courier|consolas|menlo|inconsolata|source code/.test(family)) return true;
  return attrs.face ? /mono|courier/i.test(attrs.face) : false;
};

const textContent = (nodes) =>
  nodes
    .map((n) => (n.type === 'text' ? n.text : n.tag === 'br' ? '\n' : textContent(n.children || [])))
    .join('');

const escapeText = (s) => String(s).replace(/([\\*_[\]`<>])/g, '\\$1');

export function inline(nodes, ctx = {}) {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') {
      let text = node.text;
      text = ctx.pre ? text : text.replace(/\s+/g, ' ');
      out += ctx.pre ? text : escapeText(text);
      continue;
    }

    const tag = node.tag;
    const attrs = node.attrs || {};
    const map = styleMap(attrs.style);
    const kids = node.children || [];

    if (['style', 'script', 'meta', 'title', 'link', 'head'].includes(tag)) continue;
    if (tag === 'br') {
      out += '\n';
      continue;
    }
    if (tag === 'img') {
      const src = attrs.src || attrs['data-src'] || '';
      if (!src) continue;
      out += `![${attrs.alt || ''}](${src})`;
      continue;
    }
    if (tag === 'hr') {
      out += '\n\n---\n\n';
      continue;
    }
    if (tag === 'a') {
      const inner = inline(kids, { ...ctx, link: true });
      const href = attrs.href || '';
      if (!href || !inner.trim()) {
        out += inner;
      } else if (inner.trim() === href) {
        out += `<${href}>`;
      } else {
        out += `[${inner}](${href})`;
      }
      continue;
    }

    let inner = inline(kids, ctx);
    if (!inner) continue;

    const weight = map['font-weight'] || attrs.weight || '';
    const bold = /^(bold|[6-9]00)$/.test(weight) || tag === 'strong' || (tag === 'b' && weight !== 'normal' && weight !== '400');
    const italic = map['font-style'] === 'italic' || map['font-style'] === 'oblique' || tag === 'em' || tag === 'i';
    const strike = /line-through/.test(map['text-decoration'] || '') || tag === 's' || tag === 'del' || tag === 'strike';
    const underline = /underline/.test(map['text-decoration'] || '') || tag === 'u';
    const mono = isMono(map, attrs) || ['code', 'tt', 'kbd', 'samp'].includes(tag);
    const sub = map['vertical-align'] === 'sub' || tag === 'sub';
    const sup = map['vertical-align'] === 'super' || tag === 'sup';
    const color = map.color && map.color !== '#000000' && map.color !== 'rgb(0, 0, 0)' ? map.color : '';
    const background = map['background-color'] && !/transparent|#ffffff|#fff$/.test(map['background-color']) ? map['background-color'] : '';

    if (mono) inner = '`' + inner.replace(/`/g, '\\`') + '`';
    if (strike) inner = `~~${inner}~~`;
    if (italic) inner = `*${inner}*`;
    if (bold) inner = `**${inner}**`;
    if (underline) inner = `<u>${inner}</u>`;
    if (sub) inner = `<sub>${inner}</sub>`;
    if (sup) inner = `<sup>${inner}</sup>`;
    if (color || background) {
      const style = [color && `color:${color}`, background && `background-color:${background}`].filter(Boolean).join(';');
      inner = `<span style="${style}">${inner}</span>`;
    }

    out += inner;
  }
  return out;
}

const listDepth = (ctx) => ctx.depth || 0;

function renderList(node, ctx) {
  const ordered = node.tag === 'ol';
  const depth = listDepth(ctx);
  const indent = '  '.repeat(depth);
  const start = Number(node.attrs?.start || 1);
  let index = 0;
  const lines = [];

  for (const child of node.children || []) {
    if (child.type === 'text' && !child.text.trim()) continue;
    if (child.type !== 'text' && child.tag !== 'li') {
      const stray = inline([child], { ...ctx, depth: depth + 1 }).trim();
      if (stray) lines.push(`${indent}${ordered ? `${start + index++}.` : '-'} ${stray}`);
      continue;
    }

    const liChildren = child.children || [];
    const nested = liChildren.filter((n) => n.type !== 'text' && (n.tag === 'ul' || n.tag === 'ol'));
    const own = liChildren.filter((n) => !(n.type !== 'text' && (n.tag === 'ul' || n.tag === 'ol')));

    let text = inline(own, { ...ctx, depth: depth + 1 }).replace(/\n+/g, ' ').trim();
    let task = null;
    const check = /^([\u2610\u2611\u2612\u2713\u2714\s])\s*/.exec(text);
    if (check && /[\u2610\u2611\u2612]/.test(check[1])) {
      task = /[\u2611\u2612]/.test(check[1]);
      text = text.slice(check[0].length).trim();
    }

    const bullet = ordered ? `${start + index}.` : '-';
    index++;
    if (task !== null) lines.push(`${indent}- [${task ? 'x' : ' '}] ${text}`);
    else lines.push(`${indent}${bullet} ${text}`);

    for (const sub of nested) {
      const subText = renderList(sub, { ...ctx, depth: depth + 1 });
      if (subText.trim()) lines.push(subText);
    }
  }

  return lines.join('\n');
}

const cellText = (cell, ctx) => {
  const html = inline(cell.children || [], { ...ctx, inCell: true });
  return html
    .replace(/\n+/g, '<br>')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
};

function renderTable(node, ctx) {
  const rows = [];
  const collect = (n) => {
    for (const child of n.children || []) {
      if (child.type === 'text') continue;
      if (child.tag === 'tr') {
        const cells = [];
        for (const cell of child.children || []) {
          if (cell.type === 'text') continue;
          if (cell.tag !== 'td' && cell.tag !== 'th') continue;
          const span = Math.max(1, Number(cell.attrs?.colspan || 1));
          cells.push({ text: cellText(cell, ctx), th: cell.tag === 'th' });
          for (let i = 1; i < span; i++) cells.push({ text: '', th: false });
        }
        if (cells.length) rows.push(cells);
      } else if (['thead', 'tbody', 'tfoot'].includes(child.tag)) {
        collect(child);
      }
    }
  };
  collect(node);
  if (!rows.length) return '';

  const width = Math.max(...rows.map((r) => r.length));
  const norm = rows.map((r) => {
    const cells = r.map((c) => c.text);
    while (cells.length < width) cells.push('');
    return cells;
  });

  if (norm.length === 1) {
    const single = norm[0];
    return [`| ${single.join(' | ')} |`, `| ${single.map(() => '---').join(' | ')} |`].join('\n');
  }

  const head = norm[0];
  const lines = [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...norm.slice(1).map((r) => `| ${r.join(' | ')} |`),
  ];
  return lines.join('\n');
}

function renderBlocks(nodes, ctx = {}) {
  let out = '';
  const add = (s) => {
    if (!s) return;
    out += (out && !out.endsWith('\n\n') ? '\n\n' : '') + s.replace(/\s+$/g, '');
  };

  for (const node of nodes) {
    if (node.type === 'text') {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (text) add(escapeText(text));
      continue;
    }

    const tag = node.tag;
    const kids = node.children || [];

    if (tag === 'style' || tag === 'script' || tag === 'meta' || tag === 'title' || tag === 'link' || tag === 'head') continue;

    if (/^h[1-6]$/.test(tag)) {
      const text = inline(kids, ctx).replace(/\n+/g, ' ').trim();
      if (text) add(`${'#'.repeat(Number(tag[1]))} ${text}`);
      continue;
    }

    if (tag === 'p') {
      const text = inline(kids, ctx).trim();
      if (text) add(text);
      continue;
    }

    if (tag === 'ul' || tag === 'ol') {
      const text = renderList(node, ctx);
      if (text.trim()) add(text);
      continue;
    }

    if (tag === 'table') {
      const text = renderTable(node, ctx);
      if (text) add(text);
      continue;
    }

    if (tag === 'pre') {
      const raw = textContent(kids).replace(/\n+$/, '');
      const fence = raw.includes('```') ? '~~~' : '```';
      if (raw.trim()) add(`${fence}\n${raw}\n${fence}`);
      continue;
    }

    if (tag === 'blockquote') {
      const inner = renderBlocks(kids, ctx).trim();
      if (inner) add(inner.split('\n').map((l) => `> ${l}`.trimEnd()).join('\n'));
      continue;
    }

    if (tag === 'hr') {
      add('---');
      continue;
    }

    if (['div', 'section', 'article', 'main', 'header', 'footer', 'figure', 'figcaption', 'details', 'summary', 'body', 'html', 'center'].includes(tag)) {
      const hasBlock = kids.some((k) => k.type !== 'text' && BLOCK.has(k.tag));
      if (hasBlock) {
        const inner = renderBlocks(kids, ctx).trim();
        if (inner) add(inner);
      } else {
        const text = inline(kids, ctx).trim();
        if (text) add(text);
      }
      continue;
    }

    if (tag === 'dl') {
      const inner = renderBlocks(kids, ctx).trim();
      if (inner) add(inner);
      continue;
    }

    if (tag === 'dt') {
      const text = inline(kids, ctx).trim();
      if (text) add(`**${text}**`);
      continue;
    }

    if (tag === 'dd') {
      const text = inline(kids, ctx).trim();
      if (text) add(`  ${text}`);
      continue;
    }

    const hasBlock = kids.some((k) => k.type !== 'text' && BLOCK.has(k.tag));
    if (hasBlock) {
      const inner = renderBlocks(kids, ctx).trim();
      if (inner) add(inner);
      continue;
    }

    const text = inline(kids, ctx).trim();
    if (text) add(text);
  }

  return out.trim();
}

export function htmlToMarkdown(html) {
  const nodes = parseHtml(String(html ?? ''));
  return renderBlocks(nodes)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function htmlToPlain(html) {
  const nodes = parseHtml(String(html ?? ''));
  const walk = (list) =>
    list
      .map((n) => {
        if (n.type === 'text') return n.text;
        if (n.tag === 'br') return '\n';
        if (n.tag === 'img') return n.attrs?.alt ? `[${n.attrs.alt}]` : '';
        if (n.tag === 'style' || n.tag === 'script' || n.tag === 'meta' || n.tag === 'head') return '';
        const inner = walk(n.children || []);
        return BLOCK.has(n.tag) ? `\n${inner}\n` : inner;
      })
      .join('');
  return walk(nodes)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
