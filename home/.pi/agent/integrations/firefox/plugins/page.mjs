export default {
  name: 'page',
  description: 'Datos básicos de la pestaña actual, sin selector.',
  tools: [
    {
      name: 'info',
      description: 'Título, URL, estado y tamaño de la página actual.',
      inputSchema: { type: 'object', properties: {} },
      async handler(_args, api) {
        const info = await api.evaluate(`(() => ({
          title: document.title,
          url: location.href,
          state: document.readyState,
          viewport: [innerWidth, innerHeight],
          text: (document.body?.innerText || '').length,
        }))()`);
        return JSON.stringify(info, null, 2);
      },
    },
    {
      name: 'text',
      description: 'Texto visible de la página, recortado.',
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'number', description: 'Máximo de caracteres, por defecto 4000.' } },
      },
      async handler({ limit = 4000 } = {}, api) {
        const text = await api.evaluate('document.body ? document.body.innerText : ""');
        return String(text).slice(0, limit);
      },
    },
  ],
};
