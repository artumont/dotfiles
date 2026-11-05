export const PORT = Number(process.env.FIREFOX_BIDI_PORT || 9222);
export const CALL_TIMEOUT = Number(process.env.FIREFOX_BIDI_TIMEOUT_MS || 25000);
export const ENDPOINT = `ws://127.0.0.1:${PORT}/session`;

export const log = (msg) => process.stderr.write(`firefox-bidi: ${msg}\n`);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
