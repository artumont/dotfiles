import { writeSync } from 'node:fs';
import { log } from './config.mjs';

export function start({ dispatch, shutdown }) {
  let buffer = '';
  let inflight = 0;
  let ended = false;
  let exiting = false;
  let queue = Promise.resolve();

  async function run(line) {
    inflight++;
    try {
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        log(`mensaje inválido: ${line.slice(0, 200)}`);
        return;
      }
      const out = await dispatch(msg);
      if (out) writeSync(1, JSON.stringify(out) + '\n');
    } catch (err) {
      log(`fallo al procesar: ${err?.message ?? err}`);
    } finally {
      inflight--;
      maybeExit();
    }
  }

  function pump(chunk) {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const text = line.trim();
      if (text) queue = queue.then(() => run(text));
    }
  }

  function maybeExit() {
    if (!ended || inflight > 0 || exiting) return;
    exiting = true;
    shutdown().finally(() => setTimeout(() => process.exit(0), 150));
  }

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', pump);
  process.stdin.on('end', () => {
    if (buffer.trim()) queue = queue.then(() => run(buffer.trim()));
    buffer = '';
    ended = true;
    maybeExit();
  });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      ended = true;
      maybeExit();
    });
  }
}
