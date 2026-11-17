---
name: google-workspace-mcp
description: Use when reading or writing Google Docs and Drive files through the google-workspace MCP, or when setting that server up on a fresh machine. Covers the Bitwarden Secrets Manager token in the GNOME keyring, the mcp-adapter entry, Google Cloud OAuth (test users, restricted scopes, granular consent), the tools that actually matter, and the errors that waste an afternoon.
---
Read and write Google Docs through the `google-workspace` MCP (`taylorwilsdon/google_workspace_mcp`, the PyPI package `workspace-mcp`). Verified working on this machine with account `tacobotmail@gmail.com`; treat paths and IDs as examples to re-derive.

Do not use the Firefox keyboard plugin for Docs. It types with synthetic key events, breaks on list detection, cannot do reliable selections, and cannot touch real inline images. The API path is deterministic.

## The chain

```
pi reads mcp-adapter.json
  -> env BWS_ACCESS_TOKEN = "!python3 -c '...keyring lookup...'"
  -> command bws run -- uvx workspace-mcp --single-user --tools docs drive
  -> bws injects GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET as env vars
  -> workspace-mcp uses them, no client_secret.json on disk
  -> first tool call opens OAuth in the browser, refresh token in ~/.config/google-workspace-mcp/credentials
```

The client ID and secret live in Bitwarden Secrets Manager, not in the repo. The access token to reach them lives in the GNOME keyring, not on disk.

## New machine, step by step

1. `bws` (Bitwarden Secrets Manager CLI). Not in apt, not in npm: download the release binary.

```bash
curl -sL -o /tmp/bws.zip "https://github.com/bitwarden/sdk-sm/releases/download/bws-v2.1.0/bws-x86_64-unknown-linux-gnu-2.1.0.zip"
unzip -o /tmp/bws.zip -d /tmp/bwsdl && install -m 755 /tmp/bwsdl/bws ~/.local/bin/bws
bws config server-base https://vault.bitwarden.com
```

`bws` has no login and no session file. The token goes in `BWS_ACCESS_TOKEN` or `-t`.

2. Machine account access token, stored in the keyring. Easiest path: open the dotfiles GUI (`uv run python manager.py`), tab Secretos, "Sembrar faltantes", paste the token. The item is `service=bws-mcp`, `account=access-token`.

Manual equivalent, when you want to script it:

```bash
python3 -m pip install --user --break-system-packages secretstorage
python3 -c "import secretstorage as s;b=s.dbus_init();c=s.get_default_collection(b);c.create_item('BWS access token (pi agent)',{'service':'bws-mcp','account':'access-token'},b'0.UUID.KEY:KEY',replace=True)"
```

3. Secrets Manager contents. Project `google-workspace` with exactly two secrets, key names are the env var names:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Verify before touching the MCP:

```bash
export BWS_ACCESS_TOKEN=$(python3 -c "import secretstorage as s;b=s.dbus_init();print([i.get_secret().decode() for i in s.search_items(b,{'service':'bws-mcp','account':'access-token'})][0],end='')")
bws secret list -o table
bws run -- printenv | grep GOOGLE_OAUTH
```

4. `mcp-adapter.json` entry. Only the helper command and the credentials dir, no secret values.

```json
"google-workspace": {
  "type": "stdio",
  "command": "/home/USER/.local/bin/bws",
  "args": ["run", "--", "/home/USER/.local/bin/uvx", "workspace-mcp", "--single-user", "--tools", "docs", "drive"],
  "env": {
    "BWS_ACCESS_TOKEN": "!python3 -c 'import secretstorage as s;b=s.dbus_init();print(next((i.get_secret().decode() for i in s.search_items(b,{\"service\":\"bws-mcp\",\"account\":\"access-token\"})),\"\"),end=\"\")'",
    "WORKSPACE_MCP_CREDENTIALS_DIR": "/home/USER/.config/google-workspace-mcp/credentials",
    "OAUTHLIB_INSECURE_TRANSPORT": "1"
  },
  "lifecycle": "lazy",
  "enabled": true
}
```

`!command` is pi's env interpolation and the command must be the whole value. Test it before blaming the MCP:

```bash
python3 -c 'import secretstorage as s;b=s.dbus_init();print(next((i.get_secret().decode() for i in s.search_items(b,{"service":"bws-mcp","account":"access-token"})),""),end="")' | wc -c
```

5. Google Cloud, once per project.

- Enable **Google Docs API** and **Google Drive API**
- OAuth client type **Web application**, authorized redirect URI `http://localhost:8000/oauth2callback`
- Branding page filled (app name, user support email, developer email) before Publish is clickable
- Testing mode: every account that will authorize must be in **Test users**, max 100

6. `/reload` in pi after editing `mcp-adapter.json`, then `/mcp` to confirm the server and its 36 tools.

7. Authorize. Call any tool with `user_google_email` set. The response is an ACTION REQUIRED block with an authorization URL. Open it in the browser, accept the unverified app warning, and on the granular consent screen **check every Drive and Docs permission**. Skipping those boxes yields a token with only `openid email profile`, and the MCP keeps asking for auth forever.

Confirm the callback actually carried the right scopes:

```
http://localhost:8000/oauth2callback?...&scope=...auth/drive...auth/documents...
```

If the scope list in that URL is only `email profile userinfo`, redo the consent.

## Using it

`user_google_email` is required on almost every docs tool. It must match the account that authorized, otherwise you get an auth prompt loop.

| Task | Tool |
|---|---|
| Read whole doc as markdown | `get_doc_as_markdown` (accepts `document_id` or full URL, honors `?tab=`) |
| Read one tab or one heading | `get_doc_as_markdown` with `tab_id` or `heading` |
| See tabs, headings, layout before editing | `inspect_doc_structure` |
| Replace exact text | `find_and_replace_doc` |
| Rewrite a range, insert text, delete | `modify_doc_text` |
| Several edits atomically | `batch_update_doc` |
| Tables | `create_table_with_data`, `debug_table_structure` |
| Images (public URL or local path) | `insert_doc_image` |
| Paragraph styles, headings | `update_paragraph_style` |
| Drive search, copy, share | `search_drive_files`, `copy_drive_file`, `manage_drive_access` |

Rules learned the hard way:

- Read first with `get_doc_as_markdown` or `inspect_doc_structure`. Editing blind reorders paragraphs and eats tables.
- `modify_doc_text` works on character ranges. Get the ranges from `inspect_doc_structure`, do not guess.
- Inline images are objects, not text. They survive text edits but the markdown export returns base64; expect large output and set `include_comments: false` to cut noise.
- Prefer `batch_update_doc` for a full rewrite. One call, one revision, no half-edited document.
- `include_comments: false` unless comments matter; they inflate the response.

## Errors and what they mean

| Error | Cause |
|---|---|
| `relative URL without a base` from bws | missing `bws config server-base https://vault.bitwarden.com` |
| `Doesn't contain a decryption key` | truncated or mangled access token |
| `no tools` from the MCP, no error | token empty: keyring locked, item deleted, or `!command` not resolving |
| `403 access_denied` on consent | authorizing account is not in Test users |
| `ACTION REQUIRED` repeats forever | consent was granted without Drive/Docs scopes, check the callback URL |
| `Publisher cannot be verified` | expected in Testing: click Advanced, continue |
| `Publish app` greyed out | Branding page incomplete |
| Publish rejected | Drive scopes are *restricted*, publishing needs Google verification. Stay in Testing or drop to narrower scopes |
| Tool prompt loop after successful auth | `user_google_email` does not match the authorized account |

## Costs of this setup

- Testing mode refresh tokens die after about 7 days. Reauthorize, or publish the app (blocked while using restricted Drive scopes without verification).
- `bws run` injects every secret the machine account can see. Scope it with `--project-id` when more projects appear.
- The refresh token is plaintext in `~/.config/google-workspace-mcp/credentials`. The client ID and secret are not on disk, the token is.
- `drive.file` would be a narrower scope but only sees files the app created or that were opened through the Google Picker. A doc owned by somebody else and merely shared with the account needs `drive.readonly` or `drive`.
- Access follows the authorizing account, not file ownership. If the account can open the doc in a browser, the MCP can read and write it.
