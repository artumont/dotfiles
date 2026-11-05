import { attach, call, setContextId } from './transport.mjs';
import { evaluate } from './page.mjs';
import { capture, click, currentUrl, pressKey, snapshot, typeText, navigate } from './actions.mjs';
import { DEFAULT_PRELOAD } from './input.mjs';
import { writeFileSync } from 'node:fs';

const countCookies = (res) =>
  Array.isArray(res?.cookies)
    ? res.cookies.length
    : Object.values(res?.splitByCookieStore || {}).reduce((n, store) => n + (store?.cookies?.length || 0), 0);

export const baseTools = [
  {
    name: 'tabs',
    description: 'Lista, abre, cambia o cierra pestañas de Firefox.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'new', 'switch', 'close'], description: 'Acción, por defecto list.' },
        index: { type: 'number', description: 'Índice de la pestaña para switch/close.' },
        url: { type: 'string', description: 'URL a abrir con action=new.' },
      },
    },
    async handler({ action = 'list', index = 0, url } = {}) {
      await attach();
      if (action === 'new') {
        const { context: id } = await call('browsingContext.create', { type: 'tab' });
        if (url) await call('browsingContext.navigate', { context: id, url, wait: 'complete' });
        return `pestaña nueva ${id}${url ? ' ' + url : ''}`;
      }
      const { contexts = [] } = await call('browsingContext.getTree', { maxDepth: 1 });
      if (action === 'list') {
        if (!contexts.length) return '(sin pestañas)';
        return contexts.map((c, i) => `${i}: ${c.url}`).join('\n');
      }
      const target = contexts[index];
      if (!target) throw new Error(`no existe la pestaña ${index}`);
      if (action === 'close') {
        await call('browsingContext.close', { context: target.context });
        return 'cerrada';
      }
      setContextId(target.context);
      return `foco en ${target.url}`;
    },
  },
  {
    name: 'navigate',
    description: 'Navega la pestaña actual y espera a que cargue.',
    inputSchema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'URL destino.' } },
      required: ['url'],
    },
    async handler({ url } = {}) {
      await attach();
      return navigate(url);
    },
  },
  {
    name: 'evaluate',
    description: 'Ejecuta JavaScript en la página y devuelve el valor. Espera promesas.',
    inputSchema: {
      type: 'object',
      properties: { expression: { type: 'string', description: 'Expresión JS.' } },
      required: ['expression'],
    },
    async handler({ expression } = {}) {
      await attach();
      const value = await evaluate(expression);
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    },
  },
  {
    name: 'snapshot',
    description: 'Resumen del DOM con rutas CSS y texto, para elegir selectores antes de hacer clic.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Máximo de nodos, por defecto 120.' } },
    },
    async handler({ limit = 120 } = {}) {
      await attach();
      return snapshot(limit);
    },
  },
  {
    name: 'click',
    description: 'Clic por selector, texto visible o coordenadas de viewport.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Selector CSS o texto visible.' },
        x: { type: 'number', description: 'Coordenada X del viewport.' },
        y: { type: 'number', description: 'Coordenada Y del viewport.' },
        dx: { type: 'number', description: 'Desplazamiento X desde el centro del elemento.' },
        dy: { type: 'number', description: 'Desplazamiento Y desde el centro del elemento.' },
      },
    },
    async handler(args = {}) {
      await attach();
      return click(args);
    },
  },
  {
    name: 'cookies',
    description: 'Borra las cookies del dominio actual o del indicado y reporta cuántas quedan.',
    inputSchema: {
      type: 'object',
      properties: { domain: { type: 'string', description: 'Dominio; por defecto el de location.href.' } },
    },
    async handler({ domain } = {}) {
      await attach();
      let host = domain;
      if (!host) {
        const href = await currentUrl().catch(() => '');
        try {
          host = new URL(href).hostname;
        } catch {}
        if (!host) throw new Error(`no pude leer el dominio: ${href || 'vacío'}`);
      }
      const before = countCookies(await call('storage.getCookies', { filter: { domain: host } }));
      await call('storage.deleteCookies', { filter: { domain: host } });
      const after = countCookies(await call('storage.getCookies', { filter: { domain: host } }));
      return `${before} cookies en ${host}, quedan ${after}`;
    },
  },
  {
    name: 'type',
    description: 'Enfoca un elemento y escribe texto con eventos de teclado reales.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Selector CSS del campo.' },
        text: { type: 'string', description: 'Texto a escribir.' },
        submit: { type: 'boolean', description: 'Enter al final.' },
      },
      required: ['target', 'text'],
    },
    async handler(args = {}) {
      await attach();
      return typeText(args);
    },
  },
  {
    name: 'press',
    description: 'Pulsa una tecla especial: Enter, Tab, Escape, flechas, PageDown, Home, End.',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string', description: 'Nombre de la tecla o carácter.' } },
      required: ['key'],
    },
    async handler({ key } = {}) {
      await attach();
      return pressKey(key);
    },
  },
  {
    name: 'preload',
    description: 'Inyecta un script antes de cada carga. Por defecto oculta navigator.webdriver.',
    inputSchema: {
      type: 'object',
      properties: { code: { type: 'string', description: 'Declaración function () {...}.' } },
    },
    async handler({ code } = {}) {
      await attach();
      const { script } = await call('script.addPreloadScript', { functionDeclaration: code || DEFAULT_PRELOAD });
      return `preload ${script}`;
    },
  },
  {
    name: 'screenshot',
    description: 'Captura la pestaña actual en PNG.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Ruta destino, por defecto /tmp/firefox-shot.png.' },
        fullPage: { type: 'boolean', description: 'Captura la página completa.' },
      },
    },
    async handler({ path = '/tmp/firefox-shot.png', fullPage } = {}) {
      await attach();
      const buf = await capture(path, fullPage);
      writeFileSync(path, buf);
      return `${path} (${buf.length} bytes)`;
    },
  },
];
