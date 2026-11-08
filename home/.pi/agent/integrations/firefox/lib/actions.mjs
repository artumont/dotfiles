import { call, sendNoReply, attach as openSession, setContextId } from './transport.mjs';
import { context, evaluate, waitHeight } from './page.mjs';
import { findElement, snapshotJs } from './dom.mjs';
import { clickAt, typeKeys, sendKeys, sendText, SPECIAL_KEYS } from './input.mjs';

export const currentUrl = () => evaluate('location.href');

export async function navigate(url) {
  const res = await call('browsingContext.navigate', { context: await context(), url, wait: 'complete' });
  return res?.url ?? url;
}

export const snapshot = (limit = 120) => evaluate(snapshotJs(limit));

export async function click({ target, x, y, dx = 0, dy = 0 } = {}) {
  let hit;
  let label;
  if (Number.isFinite(x) && Number.isFinite(y)) {
    hit = { x, y, tag: 'punto' };
    label = `${Math.round(x)},${Math.round(y)}`;
  } else {
    if (!target) throw new Error('falta target o x/y');
    hit = await evaluate(findElement(target));
    if (!hit) throw new Error(`no encontré elemento: ${target}`);
    hit.x += dx;
    hit.y += dy;
    label = target;
  }
  await clickAt(hit.x, hit.y);
  return `clic en <${hit.tag}> ${label}`;
}

export async function typeText({ target, text, submit } = {}) {
  const focused = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(target)});
    if (!el) return false;
    el.focus();
    return document.activeElement === el || !!document.activeElement?.isContentEditable;
  })()`);
  if (!focused) throw new Error(`no pude enfocar: ${target}`);
  const actions = [...text].flatMap((ch) => [
    { type: 'keyDown', value: ch },
    { type: 'keyUp', value: ch },
  ]);
  if (submit) {
    actions.push({ type: 'keyDown', value: SPECIAL_KEYS.Enter }, { type: 'keyUp', value: SPECIAL_KEYS.Enter });
  }
  await typeKeys(actions);
  return `${[...text].length} caracteres en ${target}${submit ? ' + Enter' : ''}`;
}

export async function pressKey(key) {
  const value = SPECIAL_KEYS[key] ?? key;
  await typeKeys([{ type: 'keyDown', value }, { type: 'keyUp', value }]);
  return `tecla ${key}`;
}

export const capture = async (path, fullPage) => {
  const id = await context();
  let restore = 0;
  if (fullPage) {
    const { width, height } = await evaluate(
      '({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })',
    );
    restore = await evaluate('innerHeight');
    sendNoReply('browsingContext.setViewport', { context: id, viewport: { width, height } });
    await waitHeight(height);
  }
  let data;
  try {
    ({ data } = await call('browsingContext.captureScreenshot', { context: id }));
  } finally {
    if (fullPage) {
      sendNoReply('browsingContext.setViewport', { context: id, viewport: null });
      await waitHeight(restore, true);
    }
  }
  return Buffer.from(data, 'base64');
};

export const api = {
  evaluate,
  navigate,
  snapshot,
  click,
  type: typeText,
  press: pressKey,
  keys: sendKeys,
  text: sendText,
  url: currentUrl,
  attach: openSession,
  call,
  // Plugins that open their own tab point evaluate/click at it with use(id);
  // use(null) hands the choice back to the visible tab.
  use: (id) => setContextId(id),
};
