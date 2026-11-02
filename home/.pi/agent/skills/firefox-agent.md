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
| `click` | CSS selector or visible text, real pointer events |
| `type` | focus + real key events, optional `submit` |
| `press` | Enter, Tab, Escape, arrows, PageDown, Home, End |
| `evaluate` | run JS in the page, returns the value |
| `screenshot` | PNG of the viewport or full page |

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
