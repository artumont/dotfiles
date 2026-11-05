#!/usr/bin/env node
// MCP server for a Firefox already running with --remote-debugging-port.
// Speaks WebDriver BiDi over ws://127.0.0.1:<port>/session.
import { handle } from './lib/mcp.mjs';
import { loadPlugins } from './lib/plugins.mjs';
import { start } from './lib/stdio.mjs';
import { baseTools } from './lib/tools.mjs';
import { detach } from './lib/transport.mjs';

const tools = [...baseTools, ...(await loadPlugins())];

start({
  dispatch: (msg) => handle(msg, tools),
  shutdown: detach,
});
