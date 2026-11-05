const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

export async function handle(msg, tools) {
  const { id, method, params } = msg || {};
  if (id === undefined || id === null) return null;
  if (method === 'initialize') {
    return ok(id, {
      protocolVersion: params?.protocolVersion ?? '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'firefox-bidi', version: '0.1.0' },
    });
  }
  if (method === 'tools/list') {
    return ok(id, { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
  }
  if (method === 'tools/call') {
    const tool = tools.find((t) => t.name === params?.name);
    if (!tool) return fail(id, -32602, `herramienta desconocida: ${params?.name}`);
    try {
      const value = await tool.handler(params?.arguments ?? {});
      return ok(id, { content: [{ type: 'text', text: String(value) }] });
    } catch (err) {
      return ok(id, { content: [{ type: 'text', text: `Error: ${err?.message ?? err}` }], isError: true });
    }
  }
  if (method === 'ping') return ok(id, {});
  return fail(id, -32601, `método no soportado: ${method}`);
}
