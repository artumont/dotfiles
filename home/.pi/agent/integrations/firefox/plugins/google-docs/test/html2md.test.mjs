import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, parseInline, plain } from '../markdown.mjs';
import { htmlToMarkdown, htmlToPlain, decodeEntities } from '../html2md.mjs';

test('headings, paragraphs and inline styles', () => {
  const blocks = parseMarkdown(['# Title', '', 'Some **bold**, *italic*, ~~gone~~, `code` and a [link](https://example.com).'].join('\n'));
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[0].level, 1);
  const para = blocks[1];
  assert.equal(para.type, 'paragraph');
  assert.deepEqual(
    para.spans.map((s) => [s.text, s.bold || false, s.italic || false, s.strike || false, s.code || false, s.link || '']),
    [
      ['Some ', false, false, false, false, ''],
      ['bold', true, false, false, false, ''],
      [', ', false, false, false, false, ''],
      ['italic', false, true, false, false, ''],
      [', ', false, false, false, false, ''],
      ['gone', false, false, true, false, ''],
      [', ', false, false, false, false, ''],
      ['code', false, false, false, true, ''],
      [' and a ', false, false, false, false, ''],
      ['link', false, false, false, false, 'https://example.com'],
      ['.', false, false, false, false, ''],
    ],
  );
});

test('nested lists and checklists', () => {
  const blocks = parseMarkdown(['- one', '  - nested', '- two', '', '1. first', '2. second', '', '- [x] done', '- [ ] todo'].join('\n'));
  const lists = blocks.filter((b) => b.type === 'list');
  assert.equal(lists.length, 7);
  assert.deepEqual(lists[0], { type: 'list', ordered: false, task: undefined, level: 0, spans: [{ text: 'one' }] });
  assert.equal(lists[1].level, 1);
  assert.equal(lists[2].spans[0].text, 'two');
  assert.equal(lists[3].ordered, true);
  assert.equal(lists[5].task, true);
  assert.equal(lists[6].task, false);
});

test('tables keep rows and inline spans', () => {
  const blocks = parseMarkdown(['| Name | Qty |', '| --- | ---: |', '| **A** | 1 |', '| B | 2 |'].join('\n'));
  const table = blocks.find((b) => b.type === 'table');
  assert.equal(table.rows.length, 3);
  assert.equal(plain(table.rows[0][0]), 'Name');
  assert.equal(table.rows[1][0][0].bold, true);
  assert.equal(plain(table.rows[2][1]), '2');
});

test('page break, rule, code fence', () => {
  const md = ['one', '', '\\pagebreak', '', '---', '', '```js', 'const a = 1;', '```'].join('\n');
  const types = parseMarkdown(md).map((b) => b.type);
  assert.deepEqual(types, ['paragraph', 'pagebreak', 'hr', 'code']);
  const code = parseMarkdown(md).find((b) => b.type === 'code');
  assert.deepEqual(code.lines, ['const a = 1;']);
});

test('inline edge cases', () => {
  assert.deepEqual(parseInline('a\\*b'), [{ text: 'a*b' }]);
  assert.deepEqual(parseInline('<u>u</u>'), [{ underline: true, text: 'u' }]);
  assert.deepEqual(parseInline('***both***'), [{ bold: true, italic: true, text: 'both' }]);
  assert.deepEqual(parseInline('snake_case_name'), [{ text: 'snake_case_name' }]);
});

test('reading Docs clipboard html', () => {
  const docs = `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1"><h1 dir="ltr"><span style="font-size:20pt;font-weight:400;">Report</span></h1><p dir="ltr"><span style="font-weight:700;">Bold</span> and <span style="font-style:italic;">italic</span></p><ul><li dir="ltr"><p dir="ltr"><span>alpha</span></p></li><li dir="ltr"><p dir="ltr"><span>beta</span></p><ul><li><p><span>deep</span></p></li></ul></li></ul><table><tr><td><p><span>h1</span></p></td><td><p><span>h2</span></p></td></tr><tr><td><p><span>1</span></p></td><td><p><span>2</span></p></td></tr></table></b>`;
  const md = htmlToMarkdown(docs);
  assert.match(md, /^# Report/);
  assert.match(md, /\*\*Bold\*\*/);
  assert.match(md, /\*italic\*/);
  assert.match(md, /- alpha/);
  assert.match(md, /- beta\n {2}- deep/);
  assert.match(md, /\| h1 \| h2 \|/);
  assert.match(md, /\| 1 \| 2 \|/);
});

test('plain text and entities', () => {
  assert.equal(htmlToPlain('<p>Hello <b>world</b></p><ul><li>a</li></ul>'), 'Hello world\n\na');
  assert.equal(decodeEntities('a &amp; b &lt;c&gt; &#65;'), 'a & b <c> A');
});
