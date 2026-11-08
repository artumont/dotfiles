# Plugins

Cada `*.mjs` de este directorio se carga al arrancar el servidor MCP y agrega herramientas con el prefijo `<plugin>_`. Un plugin también puede vivir en su propia carpeta con `index.mjs` como entrada (por ejemplo `google-docs/`). `FIREFOX_PLUGINS_DIR` apunta a otro directorio; un plugin que falla al cargar se ignora con un aviso en stderr y el resto sigue.

```js
export default {
  name: 'shop',                       // [a-z0-9_-], da el prefijo de las herramientas
  description: '...',
  match: [/^https:\/\/shop\.example\.com\//],  // opcional: string o RegExp (los string se compilan)
  tools: [
    {
      name: 'cart',
      description: '...',
      inputSchema: { type: 'object', properties: {} },
      async handler(args, api) {
        return 'texto o valor';        // se convierte con String()
      },
    },
  ],
};
```

Con `match`, la herramienta solo corre cuando `location.href` cumple alguno de los patrones; si no, responde `shop no aplica a <url>`. Se evalúa en cada llamada, no al listar.

## api

| Nombre | Qué hace |
|---|---|
| `api.evaluate(expr)` | ejecuta JS en la página, espera promesas y deserializa el resultado |
| `api.navigate(url)` | navega la pestaña actual, espera `complete` |
| `api.snapshot(limit)` | resumen del DOM con rutas CSS |
| `api.click(args)` | acepta `target` o `x`/`y`, más `dx`/`dy` |
| `api.type(args)` | `{ target, text, submit }` con eventos de teclado reales |
| `api.press(key)` | tecla especial o carácter |
| `api.url()` | `location.href` |
| `api.attach()` | abre la sesión BiDi; las herramientas lo llaman antes de tocar la página |
| `api.call(method, params)` | comando BiDi crudo, para lo que no cubre la api |

Las herramientas reciben `(args, api)`; `args` es `params.arguments` del cliente MCP, ya sin validar.

## Límites

- Los plugins corren en el proceso del servidor con acceso total a Node. Solo instala plugins en los que confíes.
- Los cambios en un plugin requieren reiniciar el servidor MCP (o `FIREFOX_PLUGINS_DIR` con otro directorio) para recargarse.
- `webExtension.install` y `webExtension.uninstall` dependen de que el Firefox en uso exponga ese módulo BiDi; si no, el error de BiDi se devuelve tal cual.
- Una herramienta que falla devuelve `isError: true` como cualquier herramienta base; no tumba el servidor.
