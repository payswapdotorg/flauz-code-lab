#!/usr/bin/env node
/**
 * Headless evidence capture for the webview-limits probe suite.
 * Opens prototypes/browser/webview-limits/index.html in headless Chromium,
 * lets the probes run (~16s), then captures the results JSON + a screenshot.
 * Writes: webview-probes.json, webview-probes-screenshot.png (next to this script).
 */
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PROBES_URL = 'file://' + path.resolve(here, '../../../prototypes/browser/webview-limits/index.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChromium() {
  const cands = [
    process.env.CDP_CHROME,
    ...['1243', '1200'].flatMap((v) => [
      `${homedir()}/.cache/ms-playwright/chromium-${v}/chrome-linux64/chrome`,
      `${homedir()}/.cache/ms-playwright/chromium-${v}/chrome-linux/chrome`,
    ]),
  ].filter(Boolean);
  for (const c of cands) if (existsSync(c)) return c;
  throw new Error('no chromium found');
}

const bin = findChromium();
const port = 9787;
const proc = spawn(bin, [
  '--headless=new', `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/flauz-probe-capture',
  '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1280,2400', 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore'] });

let ws, nextId = 1; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = nextId++;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});

try {
  let version;
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) { version = await r.json(); break; } } catch { /* retry */ }
    await sleep(250);
  }
  if (!version) throw new Error('chromium never came up');
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const pageWs = list.find((t) => t.type === 'page').webSocketDebuggerUrl;
  await new Promise((resolve, reject) => {
    ws = new WebSocket(pageWs);
    ws.onopen = resolve; ws.onerror = () => reject(new Error('ws error'));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id); pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      }
    };
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: PROBES_URL });
  await sleep(16000); // probes: P3 runs at ~9s, P1 timeout logs at ~12s
  const { result } = await send('Runtime.evaluate', { expression: 'window.__flauzProbeResults && window.__flauzProbeResults()', returnByValue: true });
  writeFileSync(path.join(here, 'webview-probes.json'), result.value || '(capture failed — page did not expose results)');
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(path.join(here, 'webview-probes-screenshot.png'), Buffer.from(data, 'base64'));
  console.log(`captured: webview-probes.json + webview-probes-screenshot.png (${(data.length * 0.75 / 1024).toFixed(0)} KB)`);
} finally {
  proc.kill('SIGKILL');
}
