import { call, getContextId, setContextId, resetContext } from './transport.mjs';
import { sleep } from './config.mjs';

export async function context() {
  const { contexts = [] } = await call('browsingContext.getTree', { maxDepth: 1 });
  const cached = getContextId();
  if (cached && contexts.some((c) => c.context === cached)) return cached;
  if (!contexts.length) throw new Error('Firefox no tiene pestañas abiertas');
  const id = (await visibleContext(contexts)) ?? contexts[0].context;
  setContextId(id);
  return id;
}

// Background tabs report "hidden"; it is the only BiDi signal for the foreground tab.
async function visibleContext(list) {
  for (const item of list) {
    try {
      const res = await call('script.evaluate', {
        expression: 'document.visibilityState',
        target: { context: item.context },
        awaitPromise: false,
        resultOwnership: 'none',
      });
      if (res?.result?.value === 'visible') return item.context;
    } catch {}
  }
  return null;
}

export const isStaleContext = (err) =>
  /no such frame|Browsing Context .* not found|invalid context/i.test(String(err?.message || err));

export async function evaluate(expression) {
  let id = await context();
  const run = () =>
    call('script.evaluate', {
      expression,
      target: { context: id },
      awaitPromise: true,
      resultOwnership: 'none',
      serializationOptions: { maxObjectDepth: 3 },
    });
  let res;
  try {
    res = await run();
  } catch (err) {
    if (!isStaleContext(err)) throw err;
    resetContext();
    id = await context();
    res = await run();
  }
  if (res?.type === 'exception') {
    throw new Error(res.exceptionDetails?.exception?.description ?? res.exceptionDetails?.text ?? 'error de JS');
  }
  return fromRemote(res.result);
}

export function fromRemote(v) {
  if (!v || typeof v !== 'object') return v;
  switch (v.type) {
    case 'undefined':
      return undefined;
    case 'null':
      return null;
    case 'string':
    case 'number':
    case 'boolean':
    case 'bigint':
      return v.value;
    case 'array':
    case 'set':
      return (v.value || []).map(fromRemote);
    case 'object':
    case 'map':
      return Object.fromEntries((v.value || []).map(([k, val]) => [String(k), fromRemote(val)]));
    default:
      return 'value' in v ? v.value : v;
  }
}

export async function waitHeight(target, shrink = false) {
  for (let i = 0; i < 50; i++) {
    try {
      const h = await evaluate('innerHeight');
      if (shrink ? h <= target + 20 : h >= target - 20) return;
    } catch {}
    await sleep(100);
  }
}
