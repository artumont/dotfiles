export function findElement(target) {
  return `(() => {
    const needle = ${JSON.stringify(target)};
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    let el = null;
    try { el = document.querySelector(needle); } catch (e) {}
    if (!el) {
      const nodes = [...document.querySelectorAll('a, button, input, textarea, select, [role=button], [role=link], [contenteditable=true]')];
      const label = (n) => norm(n.innerText || n.value || n.getAttribute('aria-label'));
      const want = norm(needle);
      el = nodes.find((n) => label(n) === want) || nodes.find((n) => label(n).includes(want)) || null;
    }
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, tag: el.tagName.toLowerCase() };
  })()`;
}

export const snapshotJs = (limit) => `(() => {
  const limit = ${limit};
  const out = ['title: ' + document.title, 'url: ' + location.href, '---'];
  const nodes = [...document.querySelectorAll('a, button, input, textarea, select, h1, h2, h3, label, [role], [contenteditable=true], img')];
  const path = (el) => {
    if (el.id) return '#' + el.id;
    const parts = [];
    let n = el;
    while (n && n.nodeType === 1 && parts.length < 6) {
      const idx = [...(n.parentElement ? n.parentElement.children : [])].indexOf(n) + 1;
      parts.unshift(n.tagName.toLowerCase() + (idx ? ':nth-child(' + idx + ')' : ''));
      n = n.parentElement;
    }
    return parts.join(' > ');
  };
  let shown = 0;
  for (const el of nodes) {
    if (shown >= limit) {
      out.push('... (' + nodes.length + ' nodos en total)');
      break;
    }
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    const type = el.getAttribute('type');
    out.push(
      el.tagName.toLowerCase() + (type ? '[type=' + type + ']' : '') + ' ' + path(el) + ' :: ' +
      String(el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.alt || '')
        .replace(/\\s+/g, ' ').trim().slice(0, 90)
    );
    shown++;
  }
  return out.join('\\n');
})()`;
