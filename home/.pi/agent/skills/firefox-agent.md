---
name: firefox-agent
description: Use when the user asks to control, automate, inspect, scrape, or test something in their own Firefox browser, with their real profile, cookies, logins, and extensions. Covers launching the Agente profile with WebDriver BiDi, the built-in firefox MCP tools, and the keyboard-only Google Docs plugin.
---
Control the user's real Firefox through WebDriver BiDi. No headless browser and no copied profile: it is their actual browser.

## Quick start

```bash
ss -ltn | grep -q 9222 || ~/.pi/agent/integrations/firefox/firefox-agent
```

`firefox-agent` opens profile `Agente` with `--remote-debugging-port 9222` and leaves other Firefox windows alone. Overrides: `FIREFOX_PROFILE=otro`, `FIREFOX_BIDI_PORT=9333`.

Server: `~/.pi/agent/integrations/firefox/firefox-bidi-mcp.mjs`, registered as `firefox` (`stdio`, `lifecycle: lazy`) in `~/.pi/agent/mcp-adapter.json`.

## Tools

| Tool | Use |
|---|---|
| `tabs` | `list`, `new` (optional `url`), `switch index`, `close index` |
| `navigate` | go to a URL in the focused tab, waits for load |
| `snapshot` | DOM outline with CSS paths and text; use before clicking |
| `click` | CSS selector, visible text, or `x`/`y` viewport coords; `dx`/`dy` offset from the element centre |
| `type` | focus a selector and send real key events, `submit` adds Enter |
| `press` | Enter, Tab, Escape, Backspace, Delete, arrows, PageUp/Down, Home, End, Space |
| `preload` | script injected before every load (default: `navigator.webdriver` reads `false`) |
| `cookies` | delete cookies for the current or given domain, then report the count |
| `evaluate` | run JS in the page and get the value back, promises are awaited |
| `screenshot` | PNG of the viewport or, with `fullPage`, the whole document |
| `page_info`, `page_text` | title, URL, ready state, and visible text of the current tab |
| `extensions_list` | installed extensions from the active profile, filtered by `active`, `type`, `query` |
| `extensions_install`, `extensions_uninstall` | install a `.xpi` path or directory, uninstall by id, when the Firefox exposes BiDi `webExtension` |

## Patterns

Read before acting: `snapshot`, then `click` or `type` with a path it printed. Text matching in `click` falls back to visible text only after a CSS selector fails, so prefer ids or `nth-child` paths.

Extract data in one call instead of many snapshots:

```js
JSON.stringify([...document.querySelectorAll('a')].map(a => [a.textContent.trim(), a.href]).slice(0, 20))
```

Async work is awaited by `evaluate`:

```js
(async () => { await new Promise(r => setTimeout(r, 2000)); return document.title })()
```

`tabs new` with a URL keeps the user's current tab untouched, which is the polite way to run a multi-step flow.

`snapshot` only lists interactive nodes and headings, capped at `limit` (default 120). It is not a page reader; use `evaluate` for text.

## Plugins

Site recipes live in `~/.pi/agent/integrations/firefox/plugins/`, one `.mjs` per plugin, loaded at MCP startup. Each plugin adds tools named `<plugin>_<tool>` and may set `match` (string or RegExp) so its tools refuse to run outside those URLs. `FIREFOX_PLUGINS_DIR` points elsewhere; `plugins/README.md` has the contract and the `api` object. Changes need an MCP restart.

A plugin can be a single `.mjs` or a folder with `index.mjs` as its entry point.

Three ship by default: `page` (generic page info), `extensions` (profile listing through `extensions.json`, plus `webExtension.*` install and uninstall), and `google-docs`. Extension listing needs the profile directory, found by mtime of `extensions.json` under the usual bases; override with `FIREFOX_PROFILE_DIR`.

## Google Docs (`docs_*`)

The `google-docs` plugin drives the document already open in this browser. No OAuth, no API key, no paid API: it types with real key events, reaches menu commands through the tool finder (`Alt+/`), and reads the document back through its export endpoint. Keyboard only: no pointer events and no system clipboard.

Setup, once per profile:

1. Sign in: `docs_login` opens accounts.google.com. The Agente profile keeps the session.
2. Turn off `Tools > Preferences > Detect lists automatically`. With it on, Docs rewrites typed text that starts with `1. ` or `- ` into a list, which breaks headings and code lines.

| Tool | Use |
|---|---|
| `docs_status` | docId, title, editor loaded, signed-in state |
| `docs_open`, `docs_new` | open by id/url, create a document |
| `docs_read` | markdown (native `.md` export), text or html; the download goes to a temp dir and is deleted right after |
| `docs_write` | markdown to typed content; `mode` = replace, append, prepend, cursor |
| `docs_format`, `docs_style`, `docs_list` | selection formatting, paragraph style, bullet/number/checklist |
| `docs_table` | insert from data or rows x cols; `action` edits rows and columns |
| `docs_image` | `url` (Google fetches it) or `path` (local file, synthetic drop, no file picker) |
| `docs_formula` | LaTeX rendered locally with pdflatex and ImageMagick, inserted as an image |
| `docs_copy` | duplicate the document (File > Make a copy), optional new name, opens the copy in a new tab |
| `docs_comment`, `docs_replace`, `docs_export`, `docs_rename` | comment, find and replace, download, title |
| `docs_tabs`, `docs_key`, `docs_type`, `docs_eval` | escape hatches |

Markdown dialect for `docs_write`: `#`..`######`, paragraphs, `**bold**`, `*italic*`, `~~strike~~`, `<u>underline</u>`, links, nested `-`/`1.`/`- [ ]` lists, pipe tables, `---`, `\pagebreak`, fenced code typed as plain lines, a single-line `$$latex$$` block that renders a formula image, and images as their own block:

```markdown
![Figure 1. Caption.](https://example.com/plot.png)
![Figure 2. Caption.](/absolute/local/path.png)
```

Notes that save time:

- Keep each `docs_write` under roughly 1500 characters. Long typing can outlive the MCP call timeout while the handler keeps going, so read the document before appending more.
- An image insertion costs a few seconds and Docs throttles repeated exports; do not verify every image with `docs_read`, check the whole document once at the end.
- `docs_rename` aborts unless the title field really has focus. That check is deliberate: Ctrl+A without focus selects the document and the next Backspace wipes it.
- Firefox keeps Ctrl+F for its own find bar, so `docs_find` opens Docs' panel through the tool finder.
- Formulas and images are inline objects, so they are not editable text and the markdown export returns them as base64 image references.
- The plugin shares the single BiDi session of the firefox MCP: while a docs tool runs, the plain firefox tools wait, and vice versa.

## CAPTCHAs, Cloudflare and Turnstile

1. Run `preload` once per MCP session. It makes `navigator.webdriver` read `false`; BiDi sets it `true` and strict challenges stay stuck while it is `true`.
2. `navigate` and poll for 5-10 s. Managed challenges clear by themselves. Act only if the title still matches `/Un momento|Just a moment|Verificación de seguridad|Attention Required/` or the body still shows a `Ray ID`.
3. Interactive Turnstile lives in a closed shadow root: `snapshot` and `document.querySelector` cannot see the checkbox. Find the container through the token input and click by coordinates:

   ```js
   (() => {
     const i = document.querySelector('input[name="cf-turnstile-response"]');
     if (!i) return null;
     const r = i.parentElement.parentElement.parentElement.getBoundingClientRect();
     return { x: r.x, y: r.y, w: r.width, h: r.height };
   })()
   ```

   The widget is roughly 300x65 at the container's left, checkbox near `x + 28, y + h / 2`.
4. Verify with evidence, never by assumption: token input gains a value, title or URL changes, body text changes. Clearance cookies are httpOnly, so page JS cannot read them; `cookies` deletes them by domain when a fresh challenge is needed.
5. Interactive Turnstile does not accept the synthetic click on any pointer path tried so far. Do not retry in a loop and do not report success without the token or a visible change. Ask the human to click once, then continue.

## Rules and limits

- One BiDi session per Firefox. The server ends its session on shutdown. Ad-hoc scripts must do the same, or the next attach fails with `Maximum number of active sessions`, and the tool reports that hint. The only fix is restarting that Firefox through `firefox-agent`.
- Never close or kill a Firefox window the user did not ask you to restart. `firefox-agent` refuses to launch when the profile is already in use; that refusal is correct, not an error to work around.
- A profile that is already running cannot gain the debug port. Close it and reopen through the launcher.
- While 9222 is open any local process can drive the browser with the user's sessions. Say so when the user leaves it running.
- `about:` and `moz-extension://` navigation is rejected by BiDi; do not use those pages for verification.
- Every BiDi call has its own timeout (`FIREFOX_BIDI_TIMEOUT_MS`, default 25000 ms). If a tool hangs past that, the call errors instead of wedging the queue; Firefox stays up.
- `type` requires the focused element to be the selector's target or a contenteditable. Focus failures come back as `no pude enfocar: <selector>`.
- `screenshot` writes to `/tmp/firefox-shot.png` unless `path` is given; `fullPage` resizes the viewport and restores the old height afterwards.

## Verifying cookies and extensions

Cookies: navigate to `https://accounts.google.com/` and check whether it lands on `myaccount.google.com` instead of `/signin`.

Extensions: subscribe to `network.beforeRequestSent` and `network.responseCompleted` from `evaluate` where possible, then inject requests to an ad domain. Blocked-before-request means an ad blocker is active. A normal request must appear in the same capture as a control, otherwise silence proves nothing.

Dark Reader injects `style.darkreader` or `data-darkreader-scheme` only when it decides to theme a site, so its absence is not evidence the extension is missing. Check `extensions.json` in the profile for `active: true` instead.
