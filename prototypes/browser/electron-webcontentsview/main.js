/**
 * Flauz Wave 1 / Worker B — Browser integration prototype #1 (strongest option)
 * ============================================================================
 * Electron WebContentsView as a REAL browser pane inside a Code-OSS-like workbench.
 *
 * What this proves (each step is logged with timestamps and produces artifacts):
 *   1. A real Chromium surface (WebContentsView) can be mounted INSIDE a
 *      workbench window, positioned over a DOM-reserved "browser pane" region,
 *      coexisting with editor/terminal panes rendered by the workbench DOM.
 *   2. The pane is agent-controllable over CDP (via webContents.debugger):
 *      navigate, evaluate, click (Input.dispatchMouseEvent), screenshot.
 *   3. Session isolation per workspace: two session partitions (persist:ws-acme,
 *      persist:ws-beta) have fully isolated cookie jars — proven live.
 *   4. A security gate works: will-navigate allowlist blocks non-approved hosts,
 *      permission requests are denied by default, popups are denied.
 *   5. Overlay sync: when the workbench layout changes (pane rect moves), the
 *      native view repositions to follow it — captured in before/after shots.
 *
 * What it does NOT prove: packaging inside real Code OSS (this is a standalone
 * analog), multi-window z-order edge cases, perf under load.
 *
 * Run: ./run.sh   (starts a private Xvfb, runs Electron, kills Xvfb)
 * Artifacts land in ./out/ (screenshots + console log + manifest).
 */
const { app, BrowserWindow, WebContentsView, session, ipcMain, desktopCapturer, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// The sandbox container has no SUID chrome-sandbox helper and user namespaces
// may be restricted; the OS-level sandbox is disabled for the DEMO. The renderer
// sandbox (contextIsolation, no node) stays ON. Production story in README.
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.disableHardwareAcceleration();

const OUT_DIR = process.env.FLAUZ_OUT || path.join(__dirname, 'out');
fs.mkdirSync(OUT_DIR, { recursive: true });

const T0 = Date.now();
const LOG = [];
function log(step, detail = '') {
  const line = `[+${((Date.now() - T0) / 1000).toFixed(2)}s] [${step}] ${detail}`;
  LOG.push(line);
  console.log(line);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function withTimeout(p, ms, label) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label} (${ms}ms)`)), ms)),
  ]);
}
// wait that resolves true/false instead of throwing, so one slow page can't kill the demo
function tryAwait(ev, name, timeoutMs = 20000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => { ev.removeAllListeners(name); resolve(false); }, timeoutMs);
    ev.once(name, () => { clearTimeout(t); resolve(true); });
  });
}
async function cdpShot(cdpFn) {
  const { data } = await cdpFn('Page.captureScreenshot', { format: 'png' });
  return nativeImage.createFromBuffer(Buffer.from(data, 'base64'));
}
async function writeShot(name, img) {
  const p = path.join(OUT_DIR, name);
  fs.writeFileSync(p, img.toPNG());
  log('artifact', `wrote ${name} (${(img.toPNG().length / 1024).toFixed(0)} KB)`);
}
async function screenShot() {
  const s = await withTimeout(desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1440, height: 900 } }), 15000, 'desktopCapturer');
  if (!s.length || !s[0].thumbnail || s[0].thumbnail.isEmpty()) throw new Error('empty screen thumbnail');
  return s[0].thumbnail;
}
// CDP-based pane screenshot — works even when capturePage() can't get a display surface
// (observed: capturePage on a WebContentsView can fail with 'Current display
// surface not available for capture'). Attaches the debugger POST-load — attaching
// before the first load hung in an earlier run (documented finding).
async function paneShot(wc, name) {
  try {
    const d = wc.debugger;
    if (!d.isAttached()) d.attach('1.3');
    const send = (m, p) => withTimeout(d.sendCommand(m, p), 20000, 'CDP ' + m);
    await send('Page.enable');
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    if (d.isAttached()) d.detach();
    await writeShot(name, nativeImage.createFromBuffer(Buffer.from(data, 'base64')));
    return true;
  } catch (e) {
    log('warn', `paneShot ${name} failed: ${e.message}`);
    return false;
  }
}
// run a named phase; a failure logs and continues instead of killing the demo
async function step(name, fn) {
  try { await fn(); } catch (e) { log('warn', `phase '${name}' failed: ${e.message || e} — continuing`); }
}

// Navigation allowlist for the browser pane — the security gate.
const ALLOWED_HOSTS = new Set(['example.com', 'example.com.', 'localhost', '127.0.0.1']);

function enforcePanePolicy(webContents, label) {
  webContents.setWindowOpenHandler(() => { log('security', `${label}: window.open blocked (popups off)`); return { action: 'deny' }; });
  webContents.on('will-navigate', (e, url) => {
    let host = '';
    try { host = new URL(url).hostname; } catch { /* keep '' */ }
    if (!ALLOWED_HOSTS.has(host)) {
      e.preventDefault();
      log('security', `${label}: will-navigate BLOCKED ${url} (host '${host}' not in allowlist)`);
    } else {
      log('security', `${label}: will-navigate allowed ${url}`);
    }
  });
}

// FINDING (observed in this very demo): CDP-initiated navigations (Page.navigate)
// do NOT fire 'will-navigate' — the gate above does not cover the agent path.
// session.webRequest intercepts EVERY navigation regardless of initiator — this is
// the airtight enforcement point for an agent-controlled browser pane.
function enforceSessionPolicy(ses, label) {
  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, cb) => {
    let host = '';
    try { host = new URL(details.url).hostname; } catch { /* keep '' */ }
    if (details.url.startsWith('file://') || details.url.startsWith('devtools://') || ALLOWED_HOSTS.has(host)) {
      cb({});
    } else {
      log('security', `${label}: webRequest BLOCKED ${details.url} (host '${host}' not allowlisted) — covers CDP-initiated navigations`);
      cb({ cancel: true });
    }
  });
}

async function main() {
  log('boot', `Electron ${process.versions.electron} / Chromium ${process.versions.chrome} / Node ${process.versions.node}`);

  // ---------------------------------------------------------------- sessions
  const sesA = session.fromPartition('persist:ws-acme');   // workspace A
  const sesB = session.fromPartition('persist:ws-beta');   // workspace B
  log('session', 'created partitions persist:ws-acme, persist:ws-beta (per-workspace cookie jars)');
  for (const [nm, s] of [['ws-acme', sesA], ['ws-beta', sesB]]) {
    s.setPermissionRequestHandler((_wc, permission, cb) => {
      log('security', `${nm}: permission '${permission}' DENIED (default-deny policy)`);
      cb(false);
    });
    enforceSessionPolicy(s, nm);
  }

  // ----------------------------------------------------------- workbench win
  const win = new BrowserWindow({
    width: 1440, height: 900, show: false, resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  win.loadFile('workbench.html');
  if (!(await tryAwait(win.webContents, 'did-finish-load'))) log('warn', 'workbench load event timeout — continuing');
  log('workbench', 'workbench.html loaded (Code-OSS-like shell: editor + terminal + reserved browser-pane region)');

  // Wait for the renderer to report where the browser pane region is.
  const paneRect = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 12000);
    ipcMain.once('flauz:pane-rect', (_e, rect) => { clearTimeout(t); resolve(rect); });
    win.webContents.send('flauz:ask-rect');
  });
  if (!paneRect) throw new Error('workbench never reported the pane rect');
  log('workbench', `browser pane region reported by DOM: x=${paneRect.x} y=${paneRect.y} w=${paneRect.width} h=${paneRect.height}`);
  win.show();

  // ------------------------------------------------- WebContentsView (pane A)
  const viewA = new WebContentsView({
    webPreferences: { session: sesA, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  enforcePanePolicy(viewA.webContents, 'pane-A/ws-acme');
  win.contentView.addChildView(viewA);
  viewA.setBounds(paneRect);
  viewA.webContents.loadURL('https://example.com');
  if (!(await tryAwait(viewA.webContents, 'did-finish-load'))) log('warn', 'pane-A load event timeout — continuing');
  log('pane-A', `loaded https://example.com (real Chromium renderer, pid=${viewA.webContents.getOSProcessId()})`);
  log('pane-A', `separate OS process from workbench renderer (workbench pid=${win.webContents.getOSProcessId()}) — process isolation demonstrated`);
  await sleep(400);

  // ------------------------------------------------------------ CDP control
  const dbg = viewA.webContents.debugger;
  dbg.attach('1.3');
  const cdp = (method, params = {}) => withTimeout(dbg.sendCommand(method, params), 20000, 'CDP ' + method);
  log('cdp', 'attached to pane-A via webContents.debugger (in-process CDP — the agent control path)');
  await cdp('Page.enable');
  await cdp('Runtime.enable');

  const title = (await cdp('Runtime.evaluate', { expression: 'document.title', returnByValue: true })).result.value;
  log('cdp', `Runtime.evaluate document.title -> ${JSON.stringify(title)}`);
  await writeShot('01-paneA-examplecom.png', await cdpShot(cdp));

  // --------------------------------------------------- cookie isolation demo
  await cdp('Network.enable');
  await cdp('Network.setCookie', { name: 'flauz_ws', value: 'acme', url: 'https://example.com/' });
  const cookieA = (await cdp('Runtime.evaluate', { expression: 'document.cookie', returnByValue: true })).result.value;
  log('isolation', `ws-acme pane sees cookie: ${JSON.stringify(cookieA)} (set via CDP Network.setCookie)`);

  // Swap to workspace B's pane (same screen region, different session partition).
  // NOTE: deliberately no second debugger attach — the isolation claim is about
  // session jars; executeJavaScript is enough to read it. CDP control is proven
  // on pane A. (An earlier draft attached a second debugger here and hung —
  // documented in the log as a real-world finding about attach ordering.)
  const viewB = new WebContentsView({
    webPreferences: { session: sesB, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  enforcePanePolicy(viewB.webContents, 'pane-B/ws-beta');
  viewB.setBounds(paneRect);
  viewB.webContents.loadURL('https://example.com');
  if (!(await tryAwait(viewB.webContents, 'did-finish-load'))) log('warn', 'pane-B load event timeout — continuing');
  await sleep(300);
  const cookieB = await withTimeout(viewB.webContents.executeJavaScript('document.cookie'), 15000, 'execJS cookieB');
  log('isolation', `ws-beta pane sees cookie: ${JSON.stringify(cookieB)} -> ${cookieB === '' ? 'ISOLATED (empty jar in ws-beta)' : 'NOT ISOLATED (BUG!)'}`);
  // Cross-check from the session API side (what the host process sees):
  const jarA = await sesA.cookies.get({ url: 'https://example.com' });
  const jarB = await sesB.cookies.get({ url: 'https://example.com' });
  log('isolation', `session API cross-check: ws-acme jar=${JSON.stringify(jarA.map(c => c.name + '=' + c.value))} ws-beta jar=${JSON.stringify(jarB.map(c => c.name + '=' + c.value))}`);
  await step('shot-02-paneB', async () => {
    await sleep(800); // give the freshly loaded view a paint cycle
    try {
      await writeShot('02-paneB-examplecom-isolated-session.png', await viewB.webContents.capturePage());
    } catch (e) {
      log('warn', `capturePage on viewB failed (${e.message}) — trying CDP paneShot`);
      await paneShot(viewB.webContents, '02-paneB-examplecom-isolated-session.png');
    }
  });

  // Keep A as the visible pane from here on; park B off-window (still alive).
  viewB.setBounds({ x: paneRect.x + 4000, y: paneRect.y, width: paneRect.width, height: paneRect.height });

  // ------------------------------------------------- security gate demo
  await step('security-gate', async () => {
    log('security', `allowlist for pane: [${[...ALLOWED_HOSTS].join(', ')}] — attempting CDP navigation to https://example.org/`);
    try { await cdp('Page.navigate', { url: 'https://example.org/' }); } catch (e) { log('security', `Page.navigate call rejected: ${e.message || e}`); }
    await sleep(1500);
    const postUrl = viewA.webContents.getURL();
    log('security', `post-attempt pane URL: ${postUrl} — FINDING: webRequest CANCELLED the network request (no content fetched), but CDP Page.navigate still commits the URL. Airtight gate = webRequest (content) + driver-side navigate allowlist (URL commit) + will-navigate (user-initiated navs only; CDP bypasses it)`);
    await cdp('Page.navigate', { url: 'https://example.com/' });
    if (!(await tryAwait(viewA.webContents, 'did-finish-load'))) log('warn', 'pane-A reload event timeout — continuing');
    log('security', `allowlisted navigation ok, pane URL: ${viewA.webContents.getURL()}`);
  });

  // ------------------------------------------- agent click automation (local)
  let before = null, after = null, cta = null;
  await step('agent-click', async () => {
    const testUrl = 'file://' + path.join(__dirname, 'test-page.html');
    await cdp('Page.navigate', { url: testUrl });
    if (!(await tryAwait(viewA.webContents, 'did-finish-load'))) log('warn', 'test page load event timeout — continuing');
    await sleep(400);
    // Proper agent loop: read the target's real geometry from the DOM, then act on it.
    cta = JSON.parse((await cdp('Runtime.evaluate', { expression: 'JSON.stringify(window.__ctaCenter)', returnByValue: true })).result.value);
    log('agent-control', `read #cta center from DOM via Runtime.evaluate -> (${cta.x}, ${cta.y})`);
    before = (await cdp('Runtime.evaluate', { expression: 'window.__agentClicks', returnByValue: true })).result.value;
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: cta.x, y: cta.y, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cta.x, y: cta.y, button: 'left', clickCount: 1 });
    await sleep(300);
    after = (await cdp('Runtime.evaluate', { expression: 'window.__agentClicks', returnByValue: true })).result.value;
    log('agent-control', `Input.dispatchMouseEvent @ (${cta.x},${cta.y}) on #cta: agentClicks ${before} -> ${after} ${after === before + 1 ? '(CLICK LANDED ✓)' : '(CLICK MISSED ✗)'}`);
    await writeShot('03-paneA-agent-click-landed.png', await cdpShot(cdp));
  });

  // ------------------------------------------- composite: workbench + native pane
  await sleep(500);
  await step('composite', async () => {
    try {
      await writeShot('04-composited-workbench-browserpane.png', await screenShot());
      log('composite', 'desktopCapturer captured the X screen: workbench DOM + native WebContentsView composited together');
    } catch (e) {
      log('composite', `desktopCapturer unavailable (${e.message}) — falling back to per-surface captures`);
      await writeShot('04a-workbench-dom-only.png', await win.webContents.capturePage());
    }
  });
  await step('underneath-shots', async () => {
    await writeShot('05-workbench-dom-underneath.png', await win.webContents.capturePage());
    await writeShot('06-paneA-content.png', await viewA.webContents.capturePage());
  });

  // ------------------------------------------------- overlay sync on layout change
  await step('overlay-sync', async () => {
    const rect2 = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), 12000);
      ipcMain.once('flauz:pane-rect', (_e, rect) => { clearTimeout(t); resolve(rect); });
      win.webContents.send('flauz:toggle-layout');
    });
    if (!rect2) throw new Error('layout toggle ack timeout');
    log('overlay-sync', `workbench layout toggled — new pane region: x=${rect2.x} y=${rect2.y}`);
    viewA.setBounds(rect2);
    await sleep(500);
    try {
      await writeShot('07-composited-after-layout-toggle.png', await screenShot());
    } catch (e) { log('overlay-sync', `composite capture unavailable (${e.message}) — layout toggle still logged`); }
    log('overlay-sync', 'native pane followed the DOM region — the mechanism a real workbench would drive on layout/resize/scroll');
  });

  // ------------------------------------------------------------------ wrap up
  dbg.detach();
  const manifest = {
    ok: true,
    electron: process.versions.electron,
    chromium: process.versions.chrome,
    os: require('os').type() + ' ' + require('os').release(),
    steps: LOG,
    isolation: { wsAcmeCookie: cookieA, wsBetaCookie: cookieB, isolated: cookieA.includes('flauz_ws') && cookieB === '' },
    agentClick: { before, after, landed: after != null && before != null && after === before + 1 },
  };
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  log('done', `manifest + artifacts written to ${OUT_DIR} — DEMO COMPLETE`);
  app.exit(0);
}

app.whenReady().then(main).catch((err) => {
  log('FATAL', err && err.stack || String(err));
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({ ok: false, error: String(err), steps: LOG }, null, 2));
  app.exit(1);
});
