---
name: firefox-agent
description: Use when the user asks to control, automate, inspect, scrape, or test something in their own Firefox browser, with their real profile, cookies, logins, and extensions. Covers launching the Agente profile with WebDriver BiDi, using the firefox MCP tools, and the session limits of that setup.
---
Control the user's real Firefox through WebDriver BiDi. No headless browser, no copied profile, no Playwright build: it is their actual browser with their cookies and extensions.

## Quick start

```bash
ss -ltn | grep -q 9222 || ~/.pi/agent/integrations/firefox/firefox-agent
```

`firefox-agent` opens the profile `Agente` with `--remote-debugging-port 9222` and leaves any other Firefox window alone. Overrides: `FIREFOX_PROFILE=otro` (name or path), `FIREFOX_BIDI_PORT=9333`.

MCP server: `~/.pi/agent/integrations/firefox/firefox-bidi-mcp.mjs`, registered as `firefox` with `lifecycle: lazy` in `~/.pi/agent/mcp-adapter.json`.

## Tools

| Tool | Use |
|---|---|
| `tabs` | `list`, `new` (optional url), `switch` (index), `close` |
| `navigate` | go to a URL in the focused tab, waits for load |
| `snapshot` | DOM outline with selectors and text, use before clicking |
| `click` | CSS selector, visible text, or `x`/`y` viewport coordinates; `dx`/`dy` offset from the element centre |
| `type` | focus + real key events, optional `submit` |
| `press` | Enter, Tab, Escape, arrows, PageDown, Home, End |
| `preload` | inject a script before every load (default: make `navigator.webdriver` read `false`) |
| `cookies` | delete cookies for the current or given domain, to replay a challenge |
| `evaluate` | run JS in the page, returns the value |
| `screenshot` | PNG of the viewport or full page |
| `key` | key with modifiers: `Ctrl+Alt+1`, `Ctrl+Shift+8`, `Ctrl+A` |
| `docs` | Google Docs: `status`, `focus`, `cursor`, `clear`, `write`, `insert`, `text`, `append`, `cells`, `read`, `check`, `image` |

## Google Docs

`docs-tools.mjs` in the same directory extends the firefox MCP (single BiDi session, no second server). Docs renders the body to canvas, so the DOM has no text nodes: never try to read or select the document with `evaluate`.

Editing rules, learned the hard way:

1. Text goes wherever the caret is, so confirm the caret before every write: `docs status`, then `docs cursor find="<text>"` and read back which match it landed on. Never assume it.
2. Never assume the caret left a table. `docs insert` and `docs text` inside a cell write into that cell and can add rows, mangling the layout. To start below a table, click the page area under it by coordinates first, then confirm the caret again.
3. Do not press Tab to move around: in Docs it switches table cells. To append to an existing line use `docs cursor find="<line>"` with `where=end` and then `docs text`.
4. Verify with `docs check` after the first write of a batch, not after the whole batch, and stop if it looks wrong instead of continuing.
5. `Ctrl+Z` is not a safe repair: it also undoes earlier good work. Fix a bad write by finding and selecting the junk text, or ask before touching anything.

- `docs write` takes a minimal markdown spec: `# ` Titulo style, `## ` Heading 1, `### ` Heading 2, `- ` bullets, `1. ` numbered, `---` page break, anything else a normal paragraph, `**bold**` inline. It clears the document first; `insert` appends at the caret without clearing and without moving it.
- `docs cursor find="texto"` uses the in-app Ctrl+F find bar: it types the needle, cycles with Enter (`occurrence`), closes with Escape and then collapses the caret to `start` or `end`, or keeps the match selected with `where=select`. This is the only reliable way to place the caret, since there is no DOM to click.
- `docs read` exports to txt and reads the file Firefox drops in `~/Downloads` (`FIREFOX_DOWNLOAD_DIR` overrides), deleting it afterwards. The export is a download, so the tab it opens stays on `about:blank`: never read the tab body, read the file.
- `docs check` is the cheap state check: same export, but whitespace collapsed into one line plus line and char counts. Use it after every write instead of a screenshot; a screenshot is only for layout questions (table shape, styles).
- Paragraph styles come from the toolbar dropdown (title) or `Ctrl+Alt+1/2` (headings, `#`-free). Enter after a heading returns to normal text.
- Tables: `docs append cells="a|b|c"` adds a row at the end of the table in one call. It goes `Ctrl+End` (the empty paragraph Docs keeps after a table), `ArrowUp` into the last row, then `Tab` once per cell to walk out of the last cell, which is what makes Docs append the row. Pass exactly as many cells as the table has columns, otherwise the walk ends in the wrong place.
- `docs cells cells="a|b|c"` fills cells from wherever the caret is, as one cell per Tab, without adding rows. `docs cursor find="text" tabs=N` parks the caret and then advances N cells, which is the quick way to reach a specific column.
- A table write from the markdown spec is limited only by columns now (11 in the picker): rows past the picker's 5 are appended with Tab while filling.
- Never type a heading that starts with `N. `: Docs auto-converts it to a numbered list and swallows the number.
- Exiting a list is one Enter plus the same toggle key; a single Enter only adds another list item.
- `docs status` reports title, URL and whether the tab is a Docs editor; `docs cursor find="..."` reports which match it landed on. Both are cheap, so run them before writing rather than assuming where the caret is.
- The document title stays read-only ("Test doc") when the session is anonymous: clicking the title focuses the body instead. Do not retry in a loop.
- `docs image path=...` reads the file in the MCP process, builds a `File` inside the page and dispatches synthetic `dragenter`/`dragover`/`drop` on the editor. Verified working with a signed-in account (inserted, checked, deleted); an anonymous session gets "No se insertaron las imágenes en el documento. Para subir imágenes, debes acceder a tu cuenta." The image lands at the drop point (`x`/`y`), not at the caret, and needs a click plus Delete to remove.
- Do not try the system clipboard: `wl-copy` content is invisible to this Firefox (Wayland selection not bridged) and `Ctrl+V` silently does nothing. The native upload dialog cannot be driven either, there is no xdotool/wtype on this host.
- Every BiDi call has its own timeout (`FIREFOX_BIDI_TIMEOUT_MS`, default 25000 ms) so one lost reply cannot wedge the server queue. If a tool still hangs, kill the MCP process and reconnect; the Firefox instance stays up.

## Patterns

Read before acting: `snapshot`, then `click` or `type` with the selector it printed.

Extract data with one `evaluate` instead of many snapshots:

```js
JSON.stringify([...document.querySelectorAll('a')].map(a => [a.textContent.trim(), a.href]).slice(0, 20))
```

Async work is supported, the tool awaits the promise:

```js
(async () => { await new Promise(r => setTimeout(r, 2000)); return document.title })()
```

Multi-step flows: `tabs new` with the URL keeps the user's current tab untouched.

## CAPTCHAs, Cloudflare and Turnstile

Steps, in order:

1. `preload` once per MCP session. It injects a script before every load that makes `navigator.webdriver` read `false`. BiDi sets it `true`, and Cloudflare's strict challenge stays stuck while it is `true`. With the spoof, the same challenge clears by itself. Verified on scrapingcourse.com, udemy.com, indeed.com, patreon.com, nowsecure.nl.
2. `navigate` and poll for 5-10 s. Managed challenges resolve alone. Only act if the title still matches `/Un momento|Just a moment|Verificación de seguridad|Attention Required/` or the body still shows a `Ray ID`.
3. Interactive Turnstile: the widget lives in a closed shadow root, so `snapshot` and `document.querySelector` cannot reach the checkbox. Locate the container through the token input:

   ```js
   (() => {
     const i = document.querySelector('input[name="cf-turnstile-response"]');
     if (!i) return null;
     const r = i.parentElement.parentElement.parentElement.getBoundingClientRect();
     return { x: r.x, y: r.y, w: r.width, h: r.height };
   })()
   ```

   The widget is roughly 300x65 at the container's left; the checkbox sits near `x + 28, y + h / 2`. Click it by coordinates:

   ```text
   click({ x: 228, y: 156 })
   ```
4. Verify with evidence, never by assumption: the token input gains a value, the title or URL changes, or the body text changes. Clearance cookies are httpOnly, so page JS cannot read them; `cookies` deletes them by domain when a fresh challenge is needed.
5. Interactive Turnstile does not accept the synthetic click, whatever the pointer path: verified on nopecha.com/captcha/turnstile, where the same click by a human produced a token immediately. Do not retry in a loop and do not report success without the token or a visible page change. Ask the human to click once, then continue the flow.

## Rules and limits

- One BiDi session per Firefox. The MCP server closes its session with `session.end` on shutdown. Ad-hoc scripts must do the same, otherwise the next attach fails with `Maximum number of active sessions` and the only fix is restarting that Firefox instance.
- Never close or kill a Firefox window the user did not ask you to restart. `firefox-agent` refuses to launch when the target profile is already in use; that refusal is correct, not an error to work around.
- A profile already running cannot gain the debug port. The profile has to be closed and reopened through the launcher.
- While port 9222 is open, any local process can drive the browser with the user's sessions. Mention it when the user leaves it running.
- `about:` and `moz-extension://` navigation is rejected by BiDi. Do not rely on those pages for verification.
- `click` and `type` fall back to visible text matching only after a CSS selector fails, so prefer stable ids or `nth-child` paths from `snapshot`.

## Verifying cookies and extensions

Cookies: navigate to `https://accounts.google.com/` and check whether the URL ends on `myaccount.google.com` instead of `/signin`.

Extensions: subscribe to `network.beforeRequestSent` and `network.responseCompleted`, then inject requests to an ad domain. Blocked-before-request means an ad blocker is active. A normal request must be present in the same capture as a control, otherwise the silence proves nothing.

Dark Reader injects `style.darkreader` or `data-darkreader-scheme` into pages only when it decides to theme that site, so its absence is not evidence that the extension is missing. Check `extensions.json` in the profile for `active: true` instead.
