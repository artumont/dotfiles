import { call } from './transport.mjs';
import { context } from './page.mjs';

export const SPECIAL_KEYS = {
  Enter: '\uE007',
  Tab: '\uE004',
  Escape: '\uE00C',
  Backspace: '\uE003',
  Delete: '\uE017',
  ArrowLeft: '\uE012',
  ArrowUp: '\uE013',
  ArrowRight: '\uE014',
  ArrowDown: '\uE015',
  PageUp: '\uE00E',
  PageDown: '\uE00F',
  Home: '\uE011',
  End: '\uE010',
  Space: '\u0020',
  F1: '\uE031',
  F2: '\uE032',
  F3: '\uE033',
  F4: '\uE034',
  F5: '\uE035',
  F6: '\uE036',
  F7: '\uE037',
  F8: '\uE038',
  F9: '\uE039',
  F10: '\uE03A',
  F11: '\uE03B',
  F12: '\uE03C',
  Ctrl: '\uE009',
  Shift: '\uE008',
  Alt: '\uE00A',
  Meta: '\uE03D',
};

export const DEFAULT_PRELOAD = `function () {
  try {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true });
  } catch (e) {}
}`;

export async function clickAt(x, y) {
  await call('input.performActions', {
    context: await context(),
    actions: [
      {
        type: 'pointer',
        id: 'mouse',
        parameters: { pointerType: 'mouse' },
        actions: [
          { type: 'pointerMove', x: Math.round(x), y: Math.round(y), origin: 'viewport' },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ],
  });
}

export async function typeKeys(actions) {
  await call('input.performActions', {
    context: await context(),
    actions: [{ type: 'key', id: 'kb', actions }],
  });
}

const MODS = { Ctrl: '\uE009', Shift: '\uE008', Alt: '\uE00A', Meta: '\uE03D' };

// steps: a key name, { key, mods }, or 'pause'. Used by plugins that need
// shortcuts such as Ctrl+Alt+1 or Ctrl+Shift+8.
export async function sendKeys(steps) {
  const actions = [];
  for (const step of steps) {
    if (step === 'pause') {
      actions.push({ type: 'pause', duration: 80 });
      continue;
    }
    const mods = typeof step === 'string' ? [] : step.mods || [];
    const key = typeof step === 'string' ? step : step.key;
    const value = SPECIAL_KEYS[key] ?? key;
    for (const m of mods) actions.push({ type: 'keyDown', value: MODS[m] });
    actions.push({ type: 'keyDown', value }, { type: 'keyUp', value });
    for (let i = mods.length - 1; i >= 0; i--) actions.push({ type: 'keyUp', value: MODS[mods[i]] });
  }
  await typeKeys(actions);
}

export async function sendText(text) {
  const actions = [...String(text ?? '')].flatMap((ch) => [
    { type: 'keyDown', value: ch },
    { type: 'keyUp', value: ch },
  ]);
  await typeKeys(actions);
}
