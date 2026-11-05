import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const PORT = process.env.FIREFOX_BIDI_PORT || '9222';
const BASES = [
  join(homedir(), '.config/mozilla/firefox'),
  join(homedir(), '.mozilla/firefox'),
  join(homedir(), 'snap/firefox/common/.mozilla/firefox'),
  join(homedir(), '.var/app/org.mozilla.firefox/.mozilla/firefox'),
];

// Several profiles can have an extensions.json, so read the one the debug
// instance was actually started with before guessing by mtime.
function profileFromProcess() {
  const parse = (args) => {
    const port = args.indexOf('--remote-debugging-port');
    const profile = args.indexOf('--profile');
    if (port < 0 || args[port + 1] !== PORT) return null;
    return profile > 0 ? args[profile + 1] : null;
  };
  let pids = [];
  try {
    pids = readdirSync('/proc').filter((p) => /^\d+$/.test(p));
  } catch {
    pids = [];
  }
  for (const pid of pids) {
    let args;
    try {
      args = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').filter(Boolean);
    } catch {
      continue;
    }
    if (!args.some((a) => /firefox/i.test(a))) continue;
    const dir = parse(args);
    if (dir) return dir;
  }
  try {
    for (const line of execSync('ps -eo args', { encoding: 'utf8' }).split('\n')) {
      if (!/firefox/i.test(line)) continue;
      const dir = parse(line.trim().split(/\s+/));
      if (dir) return dir;
    }
  } catch {}
  return null;
}

function newestProfile() {
  const found = [];
  for (const base of BASES) {
    let names;
    try {
      names = readdirSync(base);
    } catch {
      continue;
    }
    for (const name of names) {
      const dir = join(base, name);
      const db = join(dir, 'extensions.json');
      if (!existsSync(db)) continue;
      found.push({ dir, mtime: statSync(db).mtimeMs });
    }
  }
  found.sort((a, b) => b.mtime - a.mtime);
  return found[0]?.dir ?? null;
}

function profileDir() {
  const dir = process.env.FIREFOX_PROFILE_DIR || profileFromProcess() || newestProfile();
  if (!dir) throw new Error('no encontré extensions.json: define FIREFOX_PROFILE_DIR');
  return dir;
}

const addonName = (addon) => addon.defaultLocale?.name || addon.name || '(sin nombre)';

export default {
  name: 'extensions',
  description: 'Extensiones instaladas en el perfil de Firefox, e instalación o desinstalación por BiDi.',
  tools: [
    {
      name: 'list',
      description: 'Lista las extensiones del perfil activo.',
      inputSchema: {
        type: 'object',
        properties: {
          active: { type: 'boolean', description: 'Solo activas (true) o solo inactivas (false).' },
          type: { type: 'string', description: 'Filtra por tipo: extension, theme, locale, dictionary.' },
          query: { type: 'string', description: 'Texto a buscar en nombre, id o versión.' },
        },
      },
      handler({ active, type, query } = {}) {
        const dir = profileDir();
        let db;
        try {
          db = JSON.parse(readFileSync(join(dir, 'extensions.json'), 'utf8'));
        } catch (err) {
          throw new Error(`no pude leer ${dir}/extensions.json: ${err?.message ?? err}`);
        }
        const q = (query || '').toLowerCase();
        const rows = Object.values(db.addons || {})
          .filter((a) => (typeof active === 'boolean' ? Boolean(a.active) === active : true))
          .filter((a) => (type ? a.type === type : true))
          .filter((a) => (q ? `${addonName(a)} ${a.id} ${a.version}`.toLowerCase().includes(q) : true))
          .map((a) => `${a.active ? 'on ' : 'off'} ${a.type} ${addonName(a)} ${a.version} ${a.id}`);
        return `${rows.length} extensiones en ${dir}\n${rows.join('\n')}`;
      },
    },
    {
      name: 'install',
      description: 'Instala una extensión temporal desde un .xpi o directorio (BiDi webExtension.install).',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Ruta absoluta al .xpi o al directorio.' } },
        required: ['path'],
      },
      async handler({ path } = {}, api) {
        await api.attach();
        const res = await api.call('webExtension.install', { extensionData: { type: 'path', path } });
        return `instalada ${res?.extension ?? path}`;
      },
    },
    {
      name: 'uninstall',
      description: 'Desinstala una extensión por id (BiDi webExtension.uninstall).',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Id de la extensión.' } },
        required: ['id'],
      },
      async handler({ id } = {}, api) {
        await api.attach();
        await api.call('webExtension.uninstall', { extension: id });
        return `desinstalada ${id}`;
      },
    },
  ],
};
