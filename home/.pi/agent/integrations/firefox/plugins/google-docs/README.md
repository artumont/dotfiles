# docs (Google Docs plugin)

Keyboard-only Google Docs control for the firefox MCP. No OAuth, no API keys, no
paid APIs: it drives the document that is already open in the agent browser and
reads it back through the export endpoint.

Two hard constraints shaped the implementation:

- **no pointer**: no clicks anywhere, only `input.performActions` key events.
- **no clipboard**: nothing is written to or read from the system clipboard.

## How it works

| Need | Mechanism |
| --- | --- |
| focus the editor | JS focus on `.docs-texteventtarget-iframe` (no click) |
| type content | per-character key events, style toggles around spans |
| menu commands | tool finder: `Alt+/`, type the label, arrows, `Enter` |
| tables | tool finder inserts a 2x2, `Insert column` adds columns, `Tab` fills cells and appends rows |
| images | tool finder runs "Insert image by URL", the url is typed, `Enter` validates it, the insert button is clicked |
| find | Docs' find panel (via the tool finder); Firefox keeps Ctrl+F for its own find bar |
| read the document | `.../export?format=md` (fallback `txt`/`html` zip) into a tmpdir that is deleted right after reading |
| leave a table | `ArrowDown` from the last cell |
| leave a list | outdent to level 0, then `Enter`, `Enter` |

## Setup

The plugin runs inside the firefox MCP, which uses the `Agente` profile:

```bash
FIREFOX_PROFILE=Agente firefox-agent          # port 9222
```

Sign in to Google once in that window (`docs_login` opens the login page). The
profile keeps the session; the plugin never stores credentials.

One editor preference must be off: `Tools > Preferences > Detect lists
automatically`. With it on, Docs rewrites typed text that starts with `1. ` or
`- ` into a list, which corrupts headings such as `## 1. Intro` and code lines.
The plugin types structure itself, so auto-detection only gets in the way.

## Tools

| Tool | What it does |
| --- | --- |
| `docs_status` | url, docId, title, editor ready, signed-in |
| `docs_login` | opens accounts.google.com |
| `docs_open` / `docs_new` | open by id/url, create a document |
| `docs_read` | markdown (native `.md` export), text or html |
| `docs_write` | types markdown: headings, paragraphs, bold/italic/underline/strike, links, list varieties, tables, rules, page breaks, code as plain lines |
| `docs_format` | bold, italic, underline, strike, super/subscript, clear, alignment, link (applies to selection or find text) |
| `docs_style` | normal, title, subtitle, h1..h6 |
| `docs_list` | bullet, number, checklist, indent level |
| `docs_table` | insert from data / rows x cols; row and column commands |
| `docs_image` | image by public url at the caret, optional italic caption |
| `docs_comment` | Ctrl+Alt+M, typed body |
| `docs_replace` | Ctrl+H panel |
| `docs_export` | pdf, docx, odt, rtf, txt, html (zip), epub, md (saved to Downloads) |
| `docs_rename` | title field |
| `docs_find` | caret to / selection of the n-th match (Docs find panel) |
| `docs_tabs`, `docs_key`, `docs_type`, `docs_eval` | escape hatches |
| `docs_selftest` | checks tool-finder commands plus the export read path |

## Markdown coverage

Supported: `#`..`######`, paragraphs, `**bold**`, `*italic*`, `~~strike~~`,
`<u>underline</u>`, `` `code` ``, links, nested `-`/`1.`/`- [ ]` lists, pipe
tables (first row is data, Docs owns the header row), `---` rules,
`\pagebreak`, fenced code (typed as plain lines), and images as their own block:

```markdown
![Figure 1. Caption text.](https://example.com/diagram.png)
```

The image is fetched by Google from the url, so it has to be public.

Known limits of the keyboard-only path:

- checklist items are created unchecked; the checked state is not reachable by
  shortcut.
- inline code and fenced code are plain text (no monospace toggle exists).
- images work by url only; uploading a local file needs the pointer-driven
  file picker.
- table header rows and cell merging use the Table options menu; row/column
  insert and delete are available through the tool finder.
- the `md` export is Google's own markdown, so round-trips normalize bullets to
  `*` and drop page breaks from the file (images come back as base64 data urls).
- renaming verifies that the title input took focus before sending Ctrl+A; if it
  did not, the call aborts so the document is never selected and wiped.

## Tests

```bash
node --test test/*.test.mjs
```
