import { readdir, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { log } from './config.mjs';
import { api, currentUrl } from './actions.mjs';

const DEFAULT_DIR = new URL('../plugins/', import.meta.url);
const NAME = /^[a-z0-9][a-z0-9_-]*$/i;

function toPatterns(match) {
  if (!match) return [];
  const list = Array.isArray(match) ? match : [match];
  return list.map((m) => (m instanceof RegExp ? m : new RegExp(String(m))));
}

function wrap(plugin) {
  if (!plugin || typeof plugin !== 'object') throw new Error('no exporta un objeto por default');
  if (!NAME.test(plugin.name || '')) throw new Error(`name inválido: ${plugin.name}`);
  const patterns = toPatterns(plugin.match);
  const list = Array.isArray(plugin.tools) ? plugin.tools : [];
  return list.map((tool) => {
    if (!NAME.test(tool?.name || '')) throw new Error(`herramienta sin nombre válido en ${plugin.name}`);
    if (typeof tool.handler !== 'function') throw new Error(`${plugin.name}/${tool.name} sin handler`);
    return {
      name: `${plugin.name}_${tool.name}`,
      description: `[${plugin.name}] ${tool.description || plugin.description || ''}`.trim(),
      inputSchema: tool.inputSchema || { type: 'object', properties: {} },
      async handler(args = {}) {
        if (patterns.length) {
          const url = await currentUrl();
          if (!patterns.some((re) => re.test(url))) {
            throw new Error(`${plugin.name} no aplica a ${url}`);
          }
        }
        return tool.handler(args, api);
      },
    };
  });
}

export async function loadPlugins(dir = process.env.FIREFOX_PLUGINS_DIR || DEFAULT_DIR) {
  const root = dir instanceof URL ? dir : pathToFileURL(String(dir).replace(/\/?$/, '/'));
  let files;
  try {
    const names = (await readdir(root)).sort();
    files = [];
    for (const name of names) {
      const url = new URL(name, root);
      if (name.endsWith('.mjs')) {
        files.push(url);
      } else {
        // a plugin may live in its own folder, with index.mjs as the entry
        try {
          if ((await stat(url)).isDirectory()) files.push(new URL(`${name}/index.mjs`, root));
        } catch {}
      }
    }
  } catch (err) {
    log(`sin plugins en ${root.pathname}: ${err?.message ?? err}`);
    return [];
  }
  const tools = [];
  for (const file of files) {
    try {
      const mod = await import(file);
      tools.push(...wrap(mod.default));
    } catch (err) {
      log(`plugin ${file} ignorado: ${err?.message ?? err}`);
    }
  }
  return tools;
}
