#!/usr/bin/env node
/**
 * Flauz Wave 1 / Worker B — Browser integration prototype #2
 * ============================================================================
 * Separate real Chromium + raw CDP bridge (zero npm dependencies — Node ≥ 22
 * with global WebSocket + fetch).
 *
 * This is the "external browser" architecture: the workbench does NOT embed the
 * browser in-process; it drives a real Chromium over the Chrome DevTools
 * Protocol. Frames arrive via Page.startScreencast and can be painted into any
 * pane (webview view, custom editor) — see pane-mock.html.
 * (The vscode tree at 9bf9ae764da already carries a productized version of this
 * path: src/vs/platform/browserView/node/playwrightService.ts — this prototype
 * evidences the underlying mechanism with zero deps.)
 *
 * PROVES (log + artifacts in ./out/):
 *   P1  Full agent control over real Chromium via raw CDP:
 *       Page.navigate, Runtime.evaluate, Input.dispatchMouseEvent (real click),
 *       Page.captureScreenshot.
 *   P2  Session isolation per workspace two ways:
 *       (a) separate user-data-dir per workspace (two OS processes — jars never touch)
 *       (b) in-process ephemeral browser contexts (Target.createBrowserContext)
 *           — the per-agent ephemeral session model.
 *   P3  Live frame streaming: Page.startScreencast frames captured to ./frames/
 *       and replayed in a pane-like layout by pane-mock.html.
 *   P4  Real-web rendering fidelity: example.com + news.ycombinator.com captured.
 *
 * Usage:  node cdp-demo.mjs
 * Env:    CDP_CHROME=<path to a chrome/chromium binary> (default: ms-playwright cache)
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'out');
const FRAMES_DIR = path.join(__dirname, 'frames');
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(FRAMES_DIR, { recursive: true });

const T0 = Date.now();
const LOG = [];
const log = (step, msg = '') => { const l = `[+${((Date.now() - T0) / 1000).toFixed(2)}s] [${step}] ${msg}`; LOG.push(l); console.log(l); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms))]);

// ------------------------------------------------------------------ chromium
function findChromium() {
  const cands = [
    process.env.CDP_CHROME,
    ...['1243', '1200'].flatMap((v) => [
      `${homedir()}/.cache/ms-playwright/chromium-${v}/chrome-linux64/chrome`,
      `${homedir()}/.cache/ms-playwright/chromium-${v}/chrome-linux/chrome`,
    ]),
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  ].filter(Boolean);
  for (const c of cands) if (existsSync(c)) return c;
  throw new Error('no chromium binary found (set CDP_CHROME)');
}

class Cdp {
  constructor(wsUrl, label) { this.wsUrl = wsUrl; this.label = label; this.id = 0; this.pending = new Map(); this.handlers = new Set(); }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error(`ws error (${this.label})`));
      this.ws.onclose = () => { for (const [, p] of this.pending) p.reject(new Error('ws closed')); };
      this.ws.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id && this.pending.has(m.id)) {
          const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
          m.error ? rej(new Error(`${m.error.message} (${m.error.code})`)) : res(m.result);
        } else {
          for (const h of this.handlers) h(m);
        }
      };
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    const p = new Promise((res, rej) => this.pending.set(id, { res, rej }));
    this.ws.send(JSON.stringify(msg));
    return withTimeout(p, 20000, `${this.label}:${method}`);
  }
  onEvent(fn) { this.handlers.add(fn); return () => this.handlers.delete(fn); }
  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

async function launchChromium(bin, port, userDataDir, label) {
  const args = [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`,
    '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1280,800',
    '--no-first-run', '--no-default-browser-check', 'about:blank',
  ];
  const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const errLines = [];
  proc.stderr.on('data', (d) => { if (errLines.length < 30) errLines.push(String(d)); });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) { const v = await r.json(); log('launch', `${label}: chromium ${v['Browser']} pid=${proc.pid} on :${port}`); return { proc, version: v }; }
    } catch { /* not up yet */ }
    await sleep(250);
  }
  proc.kill(); throw new Error(`${label}: debugger endpoint never came up. stderr:\n${errLines.join('')}`);
}

async function pageTargetWs(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  return page.webSocketDebuggerUrl;
}

const shot = async (cdp, file, sessionId) => {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(path.join(OUT_DIR, file), Buffer.from(data, 'base64'));
  log('artifact', `wrote ${file} (${(data.length * 0.75 / 1024).toFixed(0)} KB)`);
};

// ---------------------------------------------------------------------- main
const manifest = { ok: false, steps: [] };
let chromiumA = null, chromiumB = null, cdpPageA = null, cdpBrowser = null;
try {
  const bin = findChromium();
  log('boot', `chromium binary: ${bin}`);

  // ---- P1: launch workspace-acme browser (own user-data-dir = own jar)
  chromiumA = await launchChromium(bin, 9777, '/tmp/flauz-cdp-ws-acme', 'ws-acme');
  cdpPageA = new Cdp(await pageTargetWs(9777), 'page/ws-acme');
  await cdpPageA.connect();
  await cdpPageA.send('Page.enable');
  await cdpPageA.send('Runtime.enable');
  cdpBrowser = new Cdp(chromiumA.version.webSocketDebuggerUrl, 'browser');
  await cdpBrowser.connect();

  // ---- agent control: navigate local test page, read geometry, click, verify
  const testUrl = 'file://' + path.join(__dirname, 'test-page.html');
  await cdpPageA.send('Page.navigate', { url: testUrl });
  await sleep(1200);
  const cta = JSON.parse((await cdpPageA.send('Runtime.evaluate', { expression: 'JSON.stringify(window.__ctaCenter)', returnByValue: true })).result.value);
  log('agent-control', `read #cta center via Runtime.evaluate -> (${cta.x}, ${cta.y})`);
  const before = (await cdpPageA.send('Runtime.evaluate', { expression: 'window.__agentClicks', returnByValue: true })).result.value;
  await cdpPageA.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cta.x, y: cta.y, button: 'left', clickCount: 1 });
  await cdpPageA.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cta.x, y: cta.y, button: 'left', clickCount: 1 });
  await sleep(300);
  const after = (await cdpPageA.send('Runtime.evaluate', { expression: 'window.__agentClicks', returnByValue: true })).result.value;
  log('agent-control', `click via Input.dispatchMouseEvent: ${before} -> ${after} ${after === before + 1 ? '(CLICK LANDED ✓)' : '(MISSED ✗)'}`);
  await shot(cdpPageA, '01-agent-click-landed.png');
  manifest.agentClick = { before, after, landed: after === before + 1 };

  // ---- P3: screencast frames while the page animates
  const frames = [];
  const offFrame = cdpPageA.onEvent((m) => { if (m.method === 'Page.screencastFrame') frames.push(m.params); });
  await cdpPageA.send('Page.startScreencast', { format: 'png', maxWidth: 900, maxHeight: 560, everyNthFrame: 1 });
  log('screencast', 'Page.startScreencast on — collecting frames while the page animates…');
  const ackTimer = setInterval(() => { for (const f of frames.splice(0)) { if (!f.__done) { f.__done = true; savedFrames.push(f); cdpPageA.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); } } }, 120);
  const savedFrames = [];
  for (let i = 0; i < 40 && savedFrames.length < 10; i++) await sleep(250);
  clearInterval(ackTimer); offFrame();
  await cdpPageA.send('Page.stopScreencast').catch(() => {});
  let fi = 0;
  for (const f of savedFrames.slice(0, 10)) {
    writeFileSync(path.join(FRAMES_DIR, `frame-${String(++fi).padStart(2, '0')}.png`), Buffer.from(f.data, 'base64'));
  }
  log('screencast', `captured ${fi} frames -> prototypes/browser/cdp-bridge/frames/ (pane-mock.html replays them)`);
  manifest.screencastFrames = fi;

  // ---- P4: real web rendering
  await cdpPageA.send('Page.navigate', { url: 'https://example.com' });
  await sleep(1500);
  const t1 = (await cdpPageA.send('Runtime.evaluate', { expression: 'document.title', returnByValue: true })).result.value;
  await shot(cdpPageA, '02-realweb-examplecom.png');
  await cdpPageA.send('Page.navigate', { url: 'https://news.ycombinator.com' });
  await sleep(2500);
  const t2 = (await cdpPageA.send('Runtime.evaluate', { expression: 'document.title', returnByValue: true })).result.value;
  await shot(cdpPageA, '03-realweb-hackernews.png');
  log('real-web', `rendered real sites — titles: ${JSON.stringify(t1)}, ${JSON.stringify(t2)}`);

  // ---- P2a: cookie set in ws-acme profile
  await cdpPageA.send('Network.enable');
  await cdpPageA.send('Page.navigate', { url: 'https://example.com' });
  await sleep(1200);
  await cdpPageA.send('Network.setCookie', { name: 'flauz_ws', value: 'acme', url: 'https://example.com/' });
  const cookieA = (await cdpPageA.send('Runtime.evaluate', { expression: 'document.cookie', returnByValue: true })).result.value;
  log('isolation', `ws-acme profile sees cookie: ${JSON.stringify(cookieA)}`);

  // ---- P2b: ephemeral in-process browser context (per-agent session model)
  const { browserContextId } = await cdpBrowser.send('Target.createBrowserContext', { disposeOnDetach: true });
  const { targetId } = await cdpBrowser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await cdpBrowser.send('Target.attachToTarget', { targetId, flatten: true });
  await cdpBrowser.send('Page.enable', {}, sessionId);
  await cdpBrowser.send('Page.navigate', { url: 'https://example.com' }, sessionId);
  await sleep(1500);
  const cookieEphemeral = (await cdpBrowser.send('Runtime.evaluate', { expression: 'document.cookie', returnByValue: true }, sessionId)).result.value;
  log('isolation', `ephemeral context (Target.createBrowserContext) sees cookie: ${JSON.stringify(cookieEphemeral)} -> ${cookieEphemeral === '' ? 'ISOLATED ✓' : 'NOT ISOLATED ✗'}`);
  await cdpBrowser.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  manifest.ephemeralContext = { cookie: cookieEphemeral, isolated: cookieEphemeral === '' };

  // ---- P2c: second OS process (workspace-beta) — jars never touch
  chromiumB = await launchChromium(bin, 9778, '/tmp/flauz-cdp-ws-beta', 'ws-beta');
  const cdpPageB = new Cdp(await pageTargetWs(9778), 'page/ws-beta');
  await cdpPageB.connect();
  await cdpPageB.send('Page.enable');
  await cdpPageB.send('Page.navigate', { url: 'https://example.com' });
  await sleep(1500);
  const cookieB = (await cdpPageB.send('Runtime.evaluate', { expression: 'document.cookie', returnByValue: true })).result.value;
  log('isolation', `ws-beta (separate process+profile) sees cookie: ${JSON.stringify(cookieB)} -> ${cookieB === '' ? 'ISOLATED ✓' : 'NOT ISOLATED ✗'}`);
  await shot(cdpPageB, '04-wsbeta-isolated.png');
  cdpPageB.close();
  manifest.crossProcess = { cookie: cookieB, isolated: cookieB === '' };

  manifest.ok = manifest.agentClick.landed && manifest.ephemeralContext.isolated && manifest.crossProcess.isolated;
  manifest.summary = {
    agentControl: manifest.agentClick.landed ? 'PROVEN' : 'FAILED',
    sessionIsolation: (manifest.ephemeralContext.isolated && manifest.crossProcess.isolated) ? 'PROVEN (in-process contexts + separate profiles)' : 'PARTIAL/FAILED',
    screencastFrames: manifest.screencastFrames > 0 ? `PROVEN (${manifest.screencastFrames} frames)` : 'FAILED',
    realWeb: t1 && t2 ? 'PROVEN (example.com + news.ycombinator.com)' : 'PARTIAL',
  };
  log('done', `summary: ${JSON.stringify(manifest.summary)} — DEMO COMPLETE (${manifest.ok ? 'PASS' : 'INCOMPLETE'})`);
} catch (e) {
  log('FATAL', e.stack || String(e));
  manifest.fatal = String(e);
} finally {
  manifest.steps = LOG;
  writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  try { cdpPageA && cdpPageA.close(); } catch { /* ignore */ }
  try { cdpBrowser && cdpBrowser.close(); } catch { /* ignore */ }
  chromiumA?.proc.kill('SIGKILL'); chromiumB?.proc.kill('SIGKILL');
}
process.exit(manifest.ok ? 0 : 1);
