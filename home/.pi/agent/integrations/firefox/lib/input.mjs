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
