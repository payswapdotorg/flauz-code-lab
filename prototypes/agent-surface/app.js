/* ════════════════════════════════════════════════════════════════════
   Flauz Workbench — UX prototype logic (vanilla JS, event delegation)
   Static fake data. No fetch, no servers, no build step.
   ════════════════════════════════════════════════════════════════════ */
"use strict";

/* ═══ 1. helpers ═══════════════════════════════════════════════════ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls) => { const d = document.createElement(tag); if (cls) d.className = cls; return d; };
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ═══ 2. data & state ══════════════════════════════════════════════ */
const ENVS = {
  local: {
    name: "Local", term: "local", dot: "zinc", icon: "i-monitor", sub: "bare metal · Debian 13",
    statusbar: "env: local · debian-13", ctx: "local",
    user: "z@z-dev", path: "~/acme", scope: "ws-acme", partition: "partition:persist:ws-acme",
    runtime: "bare metal · node 24.21 · pnpm 9", res: "8 vCPU · 16 GB · disk 212 GB free",
  },
  container: {
    name: "Container", term: "container", dot: "amber", icon: "i-box", sub: "devcontainer node-20 · running",
    statusbar: "env: container · node-20", ctx: "container",
    user: "z@node-20", path: "/workspace/acme-portal", scope: "ws-acme", partition: "partition:persist:ws-acme",
    runtime: "devcontainer · node-20 · pnpm 9", res: "2 vCPU · 4 GB · disk 18 GB free",
  },
  remote: {
    name: "Remote", term: "remote", dot: "teal", icon: "i-term", sub: "ssh build-01.acme.dev · connected",
    statusbar: "env: remote · build-01", ctx: "remote",
    user: "z@build-01", path: "/srv/acme", scope: "build-01", partition: "partition:remote-build-01",
    runtime: "build-01 · node-20 · pnpm 9", res: "8 vCPU · 32 GB · disk 96 GB free",
  },
  cloud: {
    name: "Cloud VM", term: "cloud", dot: "orange", icon: "i-cloud", sub: "flauz-cloud/gpu-small · stopped",
    statusbar: "env: cloud · gpu-small", ctx: "cloud",
    user: "z@gpu-small", path: "/workspace", scope: "gpu-small", partition: "partition:cloud-gpu-small",
    runtime: "vm · node-20 · CUDA 12.4", res: "4 vCPU · 16 GB · T4 · disk 64 GB free",
  },
  e2b: {
    name: "E2B", term: "e2b", dot: "emerald", icon: "i-box", sub: "sandbox 9f2 · ephemeral",
    statusbar: "env: e2b · sandbox-9f2", ctx: "e2b",
    user: "z@sandbox-9f2", path: "/home/user", scope: "e2b-9f2", partition: "session:e2b-9f2/ephemeral",
    runtime: "sandbox · node-20 · pnpm 9", res: "2 vCPU · 2 GB · ephemeral",
  },
};

const TILE_NAME = { editor: "Editor", agent: "Agent conversation", terminal: "Terminal", browser: "Browser" };

const DEMO_TASKS = [
  { id: 142, title: "Login hardening", state: "running", meta: "Agent A" },
  { id: 138, title: "Staging flakiness", state: "blocked", meta: "needs approval" },
  { id: 131, title: "Docs refresh", state: "done", meta: "14:02" },
];

const RESOURCES = [
  { id: "repo", icon: "i-commit", label: "repo acme-portal",
    states: { local: ["synced", "ok"], container: ["synced", "ok"], remote: ["synced", "ok"], cloud: ["synced", "ok"], e2b: ["shallow clone", "info"] } },
  { id: "db", icon: "i-db", label: "db staging-postgres",
    states: { local: ["no route", "off"], container: ["tunnel :5432", "warn"], remote: ["direct :5432 · connected", "ok"], cloud: ["no route", "off"], e2b: ["no route", "off"] } },
  { id: "session", icon: "i-globe", label: "browser-session ws-acme/agent-A",
    states: { local: ["attached · chromium-1243", "ok"], container: ["attached · chromium-1243", "ok"], remote: ["attached · build-01", "ok"], cloud: ["stopped", "off"], e2b: ["session:e2b-9f2", "info"] } },
  { id: "e2b", icon: "i-box", label: "env e2b-sandbox-9f2",
    states: { local: ["standby", "off"], container: ["standby", "off"], remote: ["standby", "off"], cloud: ["standby", "off"], e2b: ["active · 14:58 left", "ok"] } },
  { id: "vm", icon: "i-cloud", label: "vm flauz-cloud/gpu-small",
    states: { local: ["stopped", "off"], container: ["stopped", "off"], remote: ["stopped", "off"], cloud: ["running · gpu-small", "ok"], e2b: ["stopped", "off"] } },
  { id: "secrets", icon: "i-lock", label: "secrets vault/prod",
    states: { local: ["locked", "bad"], container: ["locked", "bad"], remote: ["locked", "bad"], cloud: ["locked", "bad"], e2b: ["locked", "bad"] } },
];

const state = {
  env: "container",
  workspace: "acme-portal",
  view: "tasks",
  preset: "agent-led",
  agentTab: "a",
  termTab: "env",
  agents: { a: { model: "claude-4.5-sonnet" }, b: { model: "gpt-5.2" } },
  approval: "pending",          // pending | approved | changes
  firstrun: false,
  maximized: null,
  viewport: "1280×800",
  tasks: [...DEMO_TASKS],
  positions: { editor: "editor", agent: "agent", terminal: "term", browser: "browser" },
};
let taskSeq = 143;

/* ═══ 3. toasts ════════════════════════════════════════════════════ */
const toastStack = $("#toast-stack");
function toast(msg, kind = "info", ms = 3600) {
  const icon = kind === "success" ? "i-check" : kind === "warn" ? "i-alert" : "i-info";
  const t = el("div", "toast " + kind);
  t.innerHTML =
    `<span class="t-ic"><svg class="ic-13"><use href="#${icon}"/></svg></span>` +
    `<span>${msg}</span>` +
    `<button class="t-x" data-action="toast-dismiss" aria-label="Dismiss notification">✕</button>`;
  toastStack.append(t);
  setTimeout(() => t.remove(), ms);
}

/* ═══ 4. popover system (menus, pickers, evidence preview) ═════════ */
const pop = $("#popover");
let popOpenedAt = 0;

function openPopover(anchor, html, opts = {}) {
  if (!pop.hidden && pop.dataset.key === opts.key) { closePopover(); return; }  // toggle
  pop.innerHTML = html;
  pop.dataset.key = opts.key || "";
  pop.hidden = false;
  pop.setAttribute("aria-label", opts.label || "Menu");
  popOpenedAt = Date.now();

  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let x, y;
  if (opts.side === "right") { x = r.right + 10; y = r.top - 20; }
  else { x = r.left; y = r.bottom + 6; }
  if (opts.align === "end") x = r.right - w;
  x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
  y = Math.max(8, Math.min(y, window.innerHeight - h - 8));
  pop.style.left = x + "px";
  pop.style.top = y + "px";
}
function closePopover() { pop.hidden = true; pop.innerHTML = ""; pop.dataset.key = ""; }
window.addEventListener("resize", closePopover);

/* ═══ 5. generic pulse highlight ═══════════════════════════════════ */
function pulse(node) {
  if (!node) return;
  node.classList.remove("pulse");
  void node.offsetWidth;            // restart animation
  node.classList.add("pulse");
  setTimeout(() => node.classList.remove("pulse"), 1600);
}
function pulseTile(key) { pulse($("#tile-" + key)); }

/* ═══ 6. environment selector — the key interaction ════════════════ */
function setEnv(id) {
  if (!ENVS[id]) return;
  state.env = id;
  const E = ENVS[id];

  /* 1 · top chip + status bar mirror */
  $("#env-dot").className = "dot dot-" + E.dot;
  $("#env-name").textContent = E.name;
  $("#sb-env-dot").className = "dot dot-" + E.dot;
  $("#sb-env-text").textContent = E.statusbar;

  /* 2 · terminal: active tab relabels + prompt/host rewrites */
  state.termTab = "env";
  renderTerminal(true);

  /* 3 · browser session chip re-scopes (0.6s spinner, then new partition) */
  const chip = $("#session-chip"), txt = $("#session-text");
  chip.classList.add("rescoping");
  txt.textContent = "re-scoping session… (0.6s)";
  setTimeout(() => {
    chip.classList.remove("rescoping");
    txt.textContent = `${E.scope} · ${E.partition}`;
  }, 600);

  /* 4 · agent tile: context badge + system line in threads + cursor tooltip */
  $("#agent-context").textContent = "context: " + E.ctx;
  appendSys("a", `environment changed → terminal + browser re-attached to ${E.name.toLowerCase()}`);
  appendSys("b", `environment changed → terminal + browser re-attached to ${E.name.toLowerCase()}`);
  $("#tip-partition").textContent = E.partition;
  flashCursorTip();

  /* context sidebar card */
  $("#ctx-env").textContent = `${E.ctx} · ${E.term === "container" ? "node-20" : E.term}`;
  $("#ctx-runtime").textContent = E.runtime;
  $("#ctx-res").textContent = E.res;

  /* 5 · resources view state chips */
  renderResources();

  /* 6 · toast */
  toast(`Environment switched → <b>${E.name}</b> · re-scoped 3 surfaces`, "success");
}

function openEnvMenu(anchor) {
  let html = `<div class="pop-head">Environment</div>`;
  for (const id of ["local", "container", "remote", "cloud", "e2b"]) {
    const E = ENVS[id];
    html +=
      `<div class="pop-row" data-action="pick-env" data-env="${id}" role="menuitem">` +
      `<svg class="ic-15"><use href="#${E.icon}"/></svg>` +
      `<span class="pr-main"><span>${E.name}</span><span class="pr-sub">${E.sub}</span></span>` +
      `<span class="dot dot-${E.dot}"></span>` +
      (id === state.env ? `<svg class="ic-13 okc-v"><use href="#i-check"/></svg>` : "") +
      `</div>`;
  }
  html += `<div class="pop-note mono">switching re-scopes terminal · browser · resources</div>`;
  openPopover(anchor, html, { key: "env", label: "Environment picker" });
}

function flashCursorTip() {
  const tip = $("#cursor-tip");
  if (!tip) return;
  tip.classList.add("show");
  setTimeout(() => tip.classList.remove("show"), 2400);
}

/* ═══ 7. terminal ══════════════════════════════════════════════════ */
function promptHTML(E) {
  return `<span class="p-u">${E.user}</span><span class="p-c">:</span><span class="p-w">${E.path}</span><span class="p-s">$</span> `;
}
function envTermHTML(E, reattach) {
  const p = promptHTML(E);
  return (
    (reattach
      ? `<div class="tl dim">re-attaching shell to ${E.term}… <span class="okc">ok (0.4s)</span></div>`
      : `<div class="tl dim">attached · session restored (0.3s) · ${E.term}</div>`) +
    `<div class="tl">${p}<span class="cmd">pnpm test src/lib/auth.test.ts</span></div>` +
    `<div class="tl out"><span class="okc">✓</span> rate-limit backoff (32ms)</div>` +
    `<div class="tl out"><span class="okc">✓</span> submit lock while pending (41ms)</div>` +
    `<div class="tl out">2 passed · 1.9s</div>` +
    `<div class="trun">` +
    `<div class="trun-tag">▸ run by Agent A · approved 14:33</div>` +
    `<div class="tl">${p}<span class="cmd">pnpm build --mode=staging</span></div>` +
    `<div class="tl out"><span class="okc">✓</span> built in 3.2s · .next/ 2.1 MB · 41 modules</div>` +
    `</div>` +
    `<div class="tl">${p}<span class="cursor"></span></div>`
  );
}
function localTermHTML() {
  const p = promptHTML(ENVS.local);
  return (
    `<div class="tl dim">local shell · no sandbox</div>` +
    `<div class="tl">${p}<span class="cmd">git status --short</span></div>` +
    `<div class="tl out"> M src/app/page.tsx</div>` +
    `<div class="tl out">?? .flauz/session.json</div>` +
    `<div class="tl">${p}<span class="cursor"></span></div>`
  );
}
function renderTerminal(reattach = false) {
  const E = ENVS[state.env];
  const envIsLocal = state.env === "local";
  $("#ttab-env").textContent = envIsLocal ? "bash — local" : `bash — ${E.term}`;
  $("#ttab-local").textContent = envIsLocal ? "bash — local (2)" : "bash — local";
  $$(".ttab").forEach(b => {
    const on = b.dataset.tab === state.termTab;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on);
  });
  $("#term-body").innerHTML = state.termTab === "local" ? localTermHTML() : envTermHTML(E, reattach);
  $("#term-body").scrollTop = 1e9;
}

/* ═══ 8. sidebar views + activity rail ═════════════════════════════ */
const VIEW_TITLES = { tasks: "Tasks", context: "Workspace · Context", resources: "Resources", evidence: "Evidence", agents: "Agents" };

function setView(v) {
  state.view = v;
  document.body.dataset.view = v;
  $$(".sview").forEach(s => s.classList.toggle("active", s.dataset.view === v));
  $("#sb-title").textContent = VIEW_TITLES[v];
  $$(".rbtn[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === v));
  document.body.classList.remove("sb-collapsed");
}

/* ═══ 9. tasks (sidebar) ═══════════════════════════════════════════ */
function renderTasks() {
  const list = $("#task-list");
  list.innerHTML = state.tasks.map(t => {
    const label = t.state === "blocked" ? `blocked · ${t.meta}` : `${t.state} · ${t.meta}`;
    return (
      `<button class="trow" data-action="task" data-id="${t.id}">` +
      `<span class="tr-line"><span class="tid">#${t.id}</span><span class="tname">${esc(t.title)}</span></span>` +
      `<span class="tr-line"><span class="chip-sm ${t.state}">${label}</span></span>` +
      `</button>`
    );
  }).join("");
  $("#tasks-empty").hidden = state.tasks.length > 0;
}
function focusNewTask() {
  setView("tasks");
  const inp = $("#new-task-input");
  inp.focus();
  pulse(inp.closest(".newtask"));
}

/* ═══ 10. resources (sidebar) ══════════════════════════════════════ */
function renderResources() {
  const box = $("#resource-list");
  box.innerHTML = RESOURCES.map(r => {
    const [label, cls] = r.states[state.env];
    return (
      `<button class="rrow" data-action="res-detail" data-id="${r.id}">` +
      `<svg class="ic-15"><use href="#${r.icon}"/></svg>` +
      `<span class="rr-main mono">${r.label}</span>` +
      `<span class="chip-sm ${cls}">${label}</span>` +
      `</button>`
    );
  }).join("");
}

/* ═══ 11. surface presets + tile menus ═════════════════════════════ */
function setPreset(p) {
  state.preset = p;
  $("#surface").dataset.preset = p;
  $$(".ppill").forEach(b => b.classList.toggle("active", b.dataset.preset === p));
  $("#preset-label").textContent = `preset: ${p} · every surface is co-equal`;
  $("#editor-mode-chip").hidden = p !== "review";
}
function applyPositions() {
  for (const k of Object.keys(state.positions)) {
    $("#tile-" + k).style.gridArea = state.positions[k];
  }
}
function swapTiles(a, b) {
  const t = state.positions[a];
  state.positions[a] = state.positions[b];
  state.positions[b] = t;
  applyPositions();
}
function toggleMaximize(key) {
  const surf = $("#surface"), tile = $("#tile-" + key);
  if (state.maximized === key) {
    surf.classList.remove("maximized");
    tile.classList.remove("max-on");
    state.maximized = null;
  } else {
    surf.classList.add("maximized");
    $$(".tile").forEach(t => t.classList.remove("max-on"));
    tile.classList.add("max-on");
    state.maximized = key;
    toast(`${TILE_NAME[key]} — maximized (esc or ⋮ to restore)`, "info");
  }
}
function openTileMenu(anchor, key) {
  const isEditor = key === "editor";
  const html =
    `<div class="pop-head">${TILE_NAME[key]}</div>` +
    `<div class="pop-row" data-action="tile-move" data-tile="${key}" role="menuitem"><svg class="ic-15"><use href="#i-max"/></svg><span>${isEditor ? "Move to panel area" : "Move to editor area"}</span></div>` +
    `<div class="pop-row" data-action="tile-max" data-tile="${key}" role="menuitem"><svg class="ic-15"><use href="#i-max"/></svg><span>${state.maximized === key ? "Restore" : "Maximize"}</span></div>` +
    `<div class="pop-row" data-action="tile-split" data-tile="${key}" role="menuitem"><svg class="ic-15"><use href="#i-panel"/></svg><span>Split</span></div>`;
  openPopover(anchor, html, { key: "tile-" + key, label: "Tile options" });
}

/* ═══ 12. editor tile ══════════════════════════════════════════════ */
const EDITOR_CRUMBS = {
  "page.tsx": "src/app › <b>page.tsx</b>",
  "agent.ts": "src/lib › <b>agent.ts</b>",
  "spec.md": "acme-portal › <b>spec.md</b>",
};
function setEditorTab(file) {
  $$(".etab").forEach(b => {
    const on = b.dataset.file === file;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on);
  });
  $$(".ebuf").forEach(b => b.classList.toggle("active", b.dataset.file === file));
  $("#editor-crumb").innerHTML = EDITOR_CRUMBS[file] || "";
}
function buildMinimap() {
  const mm = $("#minimap");
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 30; i++) {
    const row = el("i");
    row.style.width = (28 + rnd() * 64) + "%";
    if (i > 11 && i < 15) row.className = "hl";       // diff hunk region
    else if (rnd() > 0.86) row.className = "hl2";
    mm.append(row);
  }
}

/* ═══ 13. agent tile — threads, models, approval gate ══════════════ */
const MODELS = [
  ["Anthropic", ["claude-4.5-sonnet", "claude-opus-4.6"]],
  ["OpenAI", ["gpt-5.2", "o4-mini"]],
  ["Google", ["gemini-3-pro"]],
  ["Mistral", ["large-3"]],
  ["Local", ["ollama/qwen3:32b"]],
];

function setAgentTab(k) {
  state.agentTab = k;
  $$(".atab").forEach(b => {
    const on = b.dataset.agent === k;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on);
  });
  $$(".athread").forEach(t => t.classList.toggle("active", t.dataset.agent === k));
  $("#phases-a").hidden = k !== "a";
  $("#phases-b").hidden = k !== "b";
  $("#amodel-btn").dataset.agent = k;
  updateModelLabels();
}
function updateModelLabels() {
  $("#amodel-name").textContent = state.agents[state.agentTab].model;
  $("#sb-model-name").textContent = state.agents.a.model;
  const a = $(".a-model-a"), b = $(".a-model-b");
  if (a) a.textContent = state.agents.a.model;
  if (b) b.textContent = state.agents.b.model;
}
function openModelMenu(anchor, k) {
  const cur = state.agents[k].model;
  let html = `<div class="pop-head">Model · Agent ${k.toUpperCase()} <span class="pop-sub mono">${cur}</span></div>`;
  for (const [group, models] of MODELS) {
    html += `<div class="pop-sec">${group}</div>`;
    for (const m of models) {
      html +=
        `<div class="pop-row" data-action="pick-model" data-agent="${k}" data-model="${m}" role="menuitem">` +
        `<span class="mono">${m}</span>` +
        (m === cur ? `<svg class="ic-13 okc-v"><use href="#i-check"/></svg>` : "") +
        `</div>`;
    }
  }
  html += `<div class="pop-row foot" data-action="provider-keys" role="menuitem">Manage provider keys…</div>`;
  openPopover(anchor, html, { key: "model-" + k, label: "Model picker" });
}

function appendMsg(k, who, html) {
  const thread = $("#thread-" + k);
  if (!thread) return;
  const m = el("div", "msg " + who);
  m.innerHTML = html;
  thread.append(m);
  const w = $("#thread-wrap-" + k);
  if (w) w.scrollTop = w.scrollHeight;
}
function appendSys(k, text) {
  const thread = $("#thread-" + k);
  if (!thread) return;
  const s = el("div", "sysline mono");
  s.textContent = text;
  thread.append(s);
  const w = $("#thread-wrap-" + k);
  if (w) w.scrollTop = w.scrollHeight;
}
function phaseDoneHTML() {
  return (
    `<span class="phase ph-done">PLAN ✓</span><span class="ph-ar">→</span>` +
    `<span class="phase ph-done">EXECUTE ✓</span><span class="ph-ar">→</span>` +
    `<span class="phase ph-done">VERIFY ✓</span>`
  );
}

function gate() { return $("#gate-a"); }

function approve() {
  const g = gate();
  if (!g || g.dataset.gstate !== "pending") return;
  g.dataset.gstate = "approved";
  g.classList.add("ok");
  g.innerHTML =
    `<div class="gate-head"><svg class="ic-14"><use href="#i-check"/></svg><span>Approved by you · 14:34</span></div>` +
    `<div class="gate-body"><code class="mono">git push origin staging</code> released to execution — watch it land in the Terminal tile.</div>`;
  const row = el("div", "tool");
  row.innerHTML =
    `<svg class="ic-14"><use href="#i-commit"/></svg>` +
    `<code class="mono tstr">git push origin staging</code>` +
    `<span class="tstat run mono" id="push-stat">running</span>`;
  $("#tools-a").append(row);
  $("#exec-count").textContent = "4 tool calls";
  toast("Approved — <b>git push origin staging</b>", "success");
  state.approval = "approved";
  refreshSbAgents();
  const t = state.tasks.find(t => t.id === 138);
  if (t) { t.state = "running"; t.meta = "unblocked"; renderTasks(); }

  setTimeout(() => { const s = $("#push-stat"); if (s) { s.className = "tstat ok mono"; s.textContent = "ok · pushed 14:35"; } }, 1300);
  setTimeout(() => { const a = $$("#verify-a .asrt")[0]; if (a) flipAssertion(a); }, 2000);
  setTimeout(() => { const a = $$("#verify-a .asrt")[1]; if (a) flipAssertion(a); }, 2500);
  setTimeout(() => {
    $("#phases-a").innerHTML = phaseDoneHTML();
    const vs = $("#verify-state");
    if (vs) { vs.textContent = "2/2 passed"; vs.classList.add("okc"); }
    toast("Agent A — verify assertions passed (2/2)", "success");
  }, 2900);
}
function flipAssertion(a) {
  a.classList.add("done");
  a.querySelector(".amark").textContent = "✓";
}
function requestChanges() {
  const g = gate();
  if (!g || g.dataset.gstate !== "pending") return;
  g.dataset.gstate = "changes";
  g.classList.add("changes");
  g.innerHTML =
    `<div class="gate-head"><svg class="ic-14"><use href="#i-alert"/></svg><span>Changes requested — send feedback</span></div>` +
    `<div class="gate-body">Tell Agent A what to change before <code class="mono">git push origin staging</code> runs.</div>` +
    `<textarea class="gate-ta mono" id="feedback-ta" rows="2" placeholder="Do not push before tests are green"></textarea>` +
    `<div class="gate-actions"><button class="btn solid-orange" data-action="send-feedback">Send feedback</button></div>`;
  setTimeout(() => { const ta = $("#feedback-ta"); if (ta) ta.focus(); }, 60);
}
function sendFeedback() {
  const ta = $("#feedback-ta");
  const text = (ta && ta.value.trim()) || "Do not push before tests are green";
  const g = gate();
  if (g) {
    g.dataset.gstate = "sent";
    g.innerHTML =
      `<div class="gate-head"><svg class="ic-14"><use href="#i-alert"/></svg><span>Feedback sent · 14:36</span></div>` +
      `<div class="gate-body">“${esc(text)}” — Agent A is re-planning.</div>`;
  }
  appendMsg("a", "user", esc(text));
  setTimeout(() => appendMsg("a", "agent", "Understood — reordering: tests first."), 700);
  state.approval = "changes";
  refreshSbAgents();
}
function addConstraint() {
  const g = gate();
  if (!g || g.dataset.gstate !== "pending") return;
  if (g.dataset.constraint === "1") { toast("Constraint already active: never push during approval", "warn"); return; }
  g.dataset.constraint = "1";
  const meta = g.querySelector(".gate-meta");
  if (meta) {
    const c = el("span", "chip-sm info");
    c.textContent = "⌁ constraint: never push during approval";
    meta.append(c);
  }
  toast("Constraint added: never push during approval", "warn");
}
function openApproval() {
  if (state.firstrun) setFirstRun(false);
  setAgentTab("a");
  pulseTile("agent");
  setTimeout(() => {
    const g = gate();
    if (g) { g.scrollIntoView({ behavior: "smooth", block: "center" }); pulse(g); }
  }, 70);
}
function refreshSbAgents() {
  const txt = $("#sb-agents-text"), dot = $("#sb-agents-dot");
  if (state.firstrun) {
    txt.textContent = "0 agents · no approvals";
    dot.className = "dot dot-zinc";
  } else if (state.approval === "pending") {
    txt.innerHTML = "2 agents · <b class=\"amber-t\">1 approval needed</b>";
    dot.className = "dot dot-amber pulse";
  } else {
    txt.textContent = "2 agents · no approvals pending";
    dot.className = "dot dot-zinc";
  }
}
function cannedReply() {
  if (state.agentTab === "b") return "Still queued behind Agent A — I start the moment the staging push clears. Selectors are ready: email input, submit button, error banner.";
  if (state.approval === "pending") return "Waiting on your approval for <span class=\"mono\">git push origin staging</span> — verify is queued behind it. Want a rollback patch prepared meanwhile?";
  if (state.approval === "approved") return "Push is on staging and both assertions are green. Drafting the PR description next — anything you want called out?";
  if (state.approval === "changes") return "Reordered: tests first, push only after green. Updating the plan now.";
  return `On it — terminal + browser are attached to ${ENVS[state.env].name.toLowerCase()}.`;
}

/* ═══ 14. browser tile ═════════════════════════════════════════════ */
const VIEWPORTS = ["1280×800", "1440×900", "375×812"];
function setSession(scope, partition) {
  $("#session-text").textContent = `${scope} · ${partition}`;
}

/* ═══ 15. evidence — previews with provenance ══════════════════════ */
function shotHTML(kind) {
  const pending = kind === "shot-02";
  const baseline = kind === "baseline";
  const email = baseline ? "&nbsp;" : "ops@acme.dev";
  const pw = baseline ? "&nbsp;" : "••••••••";
  const btn = pending
    ? `<div class="fs-btn pending"><span class="fs-spin"></span>Signing in…</div>`
    : `<div class="fs-btn">Sign in</div>`;
  const tag = baseline ? `<span class="fs-tag">BASELINE · human attached</span>` : "";
  return (
    `<div class="fs ${baseline ? "baseline" : ""}">` +
    `<div class="fs-bar"><i></i><i></i><i></i><span class="fs-url mono">staging.acme.dev/login</span></div>` +
    `<div class="fs-page">${tag}` +
    `<div class="fs-card"><div class="fs-logo"></div><div class="fs-title">Sign in to Acme</div>` +
    `<div class="fs-field mono">${email}</div><div class="fs-field mono">${pw}</div>${btn}</div>` +
    `</div></div>`
  );
}
const EVIDENCE = {
  "shot-01": { name: "shot-01.png", prov: "browser.screenshot · Agent A · 14:31", body: shotHTML("shot-01") },
  "shot-02": { name: "shot-02.png", prov: "browser.screenshot · Agent A · 14:32", body: shotHTML("shot-02") },
  "test-output": {
    name: "test-output.log", prov: "terminal.exec · Agent A · 14:33",
    body:
      `<div class="prev mono"><span class="dim-l">$ pnpm test src/lib/auth.test.ts</span>\n` +
      `<span class="okc"> ✓ rate-limit backoff (32ms)</span>\n` +
      `<span class="okc"> ✓ submit lock while pending (41ms)</span>\n` +
      `<span class="okc"> ✓ baseline layout diff 0px</span>\n` +
      ` 3 passed · 0 failed · 1.9s</div>`,
  },
  "diff-staging": {
    name: "diff-staging.patch", prov: "git · Agent A · 14:32",
    body:
      `<div class="prev mono"><span class="dim-l">diff --git a/src/app/page.tsx b/src/app/page.tsx</span>\n` +
      `<span class="dim-l">@@ -10,6 +10,8 @@ export function LoginForm() {</span>\n` +
      `   e.preventDefault();\n` +
      `<span class="add-l">+  if (pending) return; // lock double-submit</span>\n` +
      `<span class="del-l">-  setError(null);</span>\n` +
      `<span class="add-l">+  setError(rateLimited(email) ? "Too many attempts — retry in 60s" : null);</span>\n` +
      `   try {</div>`,
  },
  "baseline-login": { name: "baseline-login.png", prov: "human · attached · 13:58", body: shotHTML("baseline") },
};
function openEvidence(id, anchor) {
  const E = EVIDENCE[id];
  if (!E) return;
  openPopover(
    anchor,
    `<div class="pop-head"><span>${E.name}</span><button class="pop-x" data-action="pop-close" aria-label="Close preview">✕</button></div>` +
    `<div class="pop-prov">${E.prov}</div>` +
    `<div class="pop-body">${E.body}</div>` +
    `<div class="pop-foot"><button class="btn ghost sm" data-action="ev-attach" data-ev="${id}">Attach to #142</button>` +
    `<span class="pop-hint mono">click outside to close</span></div>`,
    { key: "ev-" + id, side: "right", label: "Evidence preview" }
  );
}

/* ═══ 16. command palette ══════════════════════════════════════════ */
const COMMANDS = [
  { id: "new-task", label: "Flauz: New Task…", hint: "sidebar · tasks", run: focusNewTask },
  { id: "spawn-agent", label: "Flauz: Spawn Agent…", hint: "sidebar · agents roster", run: () => { setView("agents"); toast("Spawn Agent… — describe a goal, we boot a sandbox (mock)", "info"); } },
  { id: "switch-env", label: "Flauz: Switch Environment…", hint: "env selector · all surfaces", run: () => openEnvMenu($("#env-chip")) },
  { id: "browser-ws", label: "Flauz: Browser: Open in workspace session", hint: "browser tile", run: () => pulseTile("browser") },
  { id: "browser-iso", label: "Flauz: Browser: Open isolated session (per-agent)", hint: "browser tile · per-agent partition", run: () => { setSession("agent-A", "partition:iso/agent-A"); toast("spawned isolated browser session for Agent A — <b>partition:iso/agent-A</b>", "success"); } },
  { id: "term-new", label: "Flauz: Terminal: New terminal in current env", hint: "terminal tile", run: () => pulseTile("terminal") },
  { id: "ev-attach", label: "Flauz: Evidence: Attach to task…", hint: "sidebar · evidence", run: () => { setView("evidence"); toast("Attach evidence to #142 — pick artifacts (mock)", "info"); } },
  { id: "approval", label: "Flauz: Approval: Show pending (1)", hint: "agent tile · approval gate", run: openApproval },
  { id: "firstrun", label: "Flauz: Show first-run", hint: "whole workbench", run: () => setFirstRun(true) },
  { id: "folder", label: "File: Open Folder…", hint: "baseline Code OSS", section: "Baseline", run: () => toast("baseline Code OSS command", "info") },
  { id: "run-task", label: "Terminal: Run Task…", hint: "baseline Code OSS", section: "Baseline", run: () => toast("baseline Code OSS command", "info") },
];

let palOpen = false, palIdx = 0, palItems = [];
const palOverlay = $("#palette-overlay"), palInput = $("#palette-input"), palList = $("#pal-list");

function openPalette(prefill = "") {
  palOverlay.hidden = false;
  palOpen = true;
  palInput.value = prefill;
  renderPal();
  palInput.focus();
}
function closePalette() { palOverlay.hidden = true; palOpen = false; }
function fuzzy(q, text) {
  if (!q) return [];
  const needle = q.toLowerCase(), hay = text.toLowerCase();
  const idx = [];
  let ti = 0;
  for (const ch of needle) {
    if (ch === " ") continue;
    const f = hay.indexOf(ch, ti);
    if (f < 0) return null;
    idx.push(f);
    ti = f + 1;
  }
  return idx;
}
function markLabel(label, idx) {
  if (!idx || !idx.length) return esc(label);
  const set = new Set(idx);
  let out = "", i = 0;
  for (const ch of label) { out += set.has(i) ? `<mark>${esc(ch)}</mark>` : esc(ch); i++; }
  return out;
}
function renderPal() {
  const q = palInput.value.trim();
  palItems = [];
  let html = "";
  for (const sec of ["Flauz", "Baseline"]) {
    const cmds = COMMANDS.filter(c => (c.section || "Flauz") === sec && fuzzy(q, c.label));
    if (!cmds.length) continue;
    html += `<div class="pal-sec">${sec}</div>`;
    for (const c of cmds) {
      const m = fuzzy(q, c.label);
      palItems.push(c);
      html += `<div class="pi" data-action="cmd" data-cmd="${c.id}" role="option" aria-selected="false">` +
        `<span class="pi-label">${markLabel(c.label, m)}</span>` +
        `<span class="pi-hint mono">${c.hint}</span></div>`;
    }
  }
  if (!palItems.length) html = `<div class="pal-empty">No matching commands — try “agent”, “terminal” or “env”.</div>`;
  palList.innerHTML = html;
  palIdx = 0;
  paintPalActive();
}
function paintPalActive() {
  const rows = $$(".pi", palList);
  rows.forEach((r, i) => {
    const on = i === palIdx;
    r.classList.toggle("active", on);
    r.setAttribute("aria-selected", on);
  });
  if (rows[palIdx]) rows[palIdx].scrollIntoView({ block: "nearest" });
}
function movePal(dir) {
  if (!palItems.length) return;
  palIdx = (palIdx + dir + palItems.length) % palItems.length;
  paintPalActive();
}
function runPalActive() {
  const c = palItems[palIdx];
  if (!c) return;
  closePalette();
  c.run();
}

palInput.addEventListener("input", renderPal);
palInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); movePal(1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); movePal(-1); }
  else if (e.key === "Enter") { e.preventDefault(); runPalActive(); }
});
palList.addEventListener("mouseover", (e) => {
  const row = e.target.closest(".pi");
  if (!row) return;
  const i = $$(".pi", palList).indexOf(row);
  if (i >= 0 && i !== palIdx) { palIdx = i; paintPalActive(); }
});

/* ═══ 17. first-run mode + welcome card ════════════════════════════ */
function setFirstRun(on) {
  state.firstrun = on;
  document.body.classList.toggle("firstrun", on);
  $("#welcome").hidden = !on;
  $("#firstrun-btn").setAttribute("aria-pressed", String(on));
  closePopover();
  if (state.maximized) toggleMaximize(state.maximized);
  if (on) {
    state.tasks = [];
    toast("First-run state — empty workbench (mock)", "info");
  } else {
    state.tasks = [...DEMO_TASKS];
  }
  renderTasks();
  refreshSbAgents();
}

/* ═══ 18. workspace chip ═══════════════════════════════════════════ */
function openWorkspaceMenu(anchor) {
  const rows = ["acme-portal", "flauz-docs"].map(ws =>
    `<div class="pop-row" data-action="pick-workspace" data-ws="${ws}" role="menuitem">` +
    `<svg class="ic-15"><use href="#i-grid"/></svg>` +
    `<span class="pr-main"><span>${ws}</span><span class="pr-sub">${ws === state.workspace ? "active workspace" : "recent"}</span></span>` +
    (ws === state.workspace ? `<svg class="ic-13 okc-v"><use href="#i-check"/></svg>` : "") +
    `</div>`
  ).join("");
  openPopover(
    anchor,
    `<div class="pop-head">Switch workspace</div>${rows}` +
    `<div class="pop-row" data-action="new-workspace" role="menuitem"><svg class="ic-15"><use href="#i-plus"/></svg><span>+ new workspace…</span></div>`,
    { key: "ws", label: "Workspace picker" }
  );
}

/* ═══ 19. delegated click handling — one switchboard ═══════════════ */
document.addEventListener("click", (e) => {
  const actEl = e.target.closest("[data-action]");
  const inPop = pop.contains(e.target);
  if (actEl) handleAction(actEl, actEl.dataset);
  if (!pop.hidden && !inPop && Date.now() - popOpenedAt > 80) closePopover();
});

function handleAction(a, d) {
  switch (d.action) {

    /* top bar */
    case "palette": openPalette(); break;
    case "palette-close": closePalette(); break;
    case "workspace-menu": openWorkspaceMenu(a); break;
    case "pick-workspace":
      state.workspace = d.ws;
      $("#ws-chip").innerHTML = `${esc(d.ws)} <span class="chev">▾</span>`;
      closePopover();
      toast(`Workspace switched → <b>${esc(d.ws)}</b> (mock — surfaces keep state)`, "success");
      break;
    case "new-workspace": closePopover(); toast("New workspace… (mock)", "info"); break;
    case "env-menu": openEnvMenu(a); break;
    case "pick-env": closePopover(); setEnv(d.env); break;
    case "firstrun": setFirstRun(!state.firstrun); break;
    case "avatar-toast": toast("Signed in as z@flauz.dev · workspace acme-portal (mock)", "info"); break;

    /* activity rail */
    case "rail": {
      const v = d.view;
      if (state.view === v && !document.body.classList.contains("sb-collapsed")) {
        document.body.classList.add("sb-collapsed");
      } else setView(v);
      break;
    }
    case "rail-baseline": toast("Baseline Code OSS surface — never regressed", "info"); break;
    case "toggle-sidebar": document.body.classList.toggle("sb-collapsed"); break;

    /* sidebar header actions */
    case "focus-new-task": focusNewTask(); break;
    case "ctx-info": toast("Workspace acme-portal · 3 linked files · 2 agents · env " + ENVS[state.env].ctx, "info"); break;
    case "res-refresh": toast("Resources re-scanned — 6 attached (mock)", "info"); break;
    case "ev-filter": toast("Filter evidence — by agent / tool / time (mock)", "info"); break;
    case "spawn-agent": openPalette("Flauz: Spawn Agent"); break;

    /* tasks */
    case "task": {
      const t = state.tasks.find(x => x.id === Number(d.id));
      if (!t) break;
      if (t.state === "running") { setAgentTab("a"); pulseTile("agent"); }
      else if (t.state === "blocked") openApproval();
      else if (t.state === "done") toast(`#${t.id} ${esc(t.title)} — done 14:02 · 4 evidence files (mock)`, "info");
      else toast(`#${t.id} ${esc(t.title)} — queued · no agent assigned yet (mock)`, "info");
      break;
    }

    /* context view */
    case "open-file": setEditorTab(d.file); pulseTile("editor"); break;
    case "mem-file": toast(`${esc(d.file)} — workspace file (mock)`, "info"); break;

    /* resources */
    case "res-detail": {
      const r = RESOURCES.find(x => x.id === d.id);
      if (r) toast(`${r.label} — ${r.states[state.env][0]} (mock)`, "info");
      break;
    }

    /* evidence */
    case "evidence": openEvidence(d.ev, a); break;
    case "ev-attach": closePopover(); toast(`${EVIDENCE[d.ev].name} → attached to #142 (already linked — mock)`, "success"); break;
    case "pop-close": closePopover(); break;

    /* agents roster */
    case "open-agent": setAgentTab(d.agent); pulseTile("agent"); break;

    /* presets + tile menus */
    case "preset": setPreset(d.preset); break;
    case "tile-menu": openTileMenu(a, d.tile); break;
    case "tile-move": {
      const key = d.tile;
      const other = key === "editor" ? "terminal" : "editor";
      swapTiles(key, other);
      closePopover();
      toast(`Moved <b>${TILE_NAME[key]}</b> → ${key === "editor" ? "panel" : "editor"} area (grid swap)`, "info");
      break;
    }
    case "tile-max": closePopover(); toggleMaximize(d.tile); break;
    case "tile-split": closePopover(); toast(`${TILE_NAME[d.tile]} — split pane queued (layout v3, mock)`, "info"); break;

    /* editor */
    case "editor-tab": setEditorTab(d.file); break;

    /* terminal */
    case "term-tab": state.termTab = d.tab; renderTerminal(false); break;
    case "new-terminal": pulseTile("terminal"); toast(`terminal — new bash tab in ${ENVS[state.env].term} (mock)`, "info"); break;

    /* agent tile */
    case "agent-tab": setAgentTab(d.agent); break;
    case "model-menu": openModelMenu(a, d.agent || state.agentTab); break;
    case "pick-model":
      state.agents[d.agent].model = d.model;
      updateModelLabels();
      closePopover();
      toast(`Agent ${d.agent.toUpperCase()} model → <b>${esc(d.model)}</b>`, "info");
      break;
    case "provider-keys": closePopover(); toast("Provider keys — settings › agents › providers (mock)", "info"); break;
    case "approve": approve(); break;
    case "request-changes": requestChanges(); break;
    case "send-feedback": sendFeedback(); break;
    case "add-constraint": addConstraint(); break;

    /* browser tile */
    case "nav-back": toast("browser: no history yet — session opened at /login (mock)", "info"); break;
    case "nav-fwd": toast("browser: no forward history (mock)", "info"); break;
    case "nav-reload": toast("reloaded https://staging.acme.dev/login (mock)", "info"); break;
    case "omni": toast("omnibox — type a URL or search (mock)", "info"); break;
    case "session-info": toast(`browser session — ${esc($("#session-text").textContent)} · storage: persist (mock)`, "info"); break;
    case "viewport": {
      const i = (VIEWPORTS.indexOf(state.viewport) + 1) % VIEWPORTS.length;
      state.viewport = VIEWPORTS[i];
      $("#viewport-chip").textContent = state.viewport;
      toast(`viewport: ${state.viewport} (mock)`, "info");
      break;
    }
    case "mock-page": toast("mock page — this link is part of the fake render", "info"); break;

    /* status bar */
    case "sb-git": toast("Source control: main clean · 2 files staged by Agent A (mock)", "info"); break;
    case "show-approval": openApproval(); break;

    /* palette rows */
    case "cmd": {
      const c = COMMANDS.find(x => x.id === d.cmd);
      if (c) { closePalette(); c.run(); }
      break;
    }

    /* first-run */
    case "welcome-back": setFirstRun(false); break;
    case "welcome-dismiss": $("#welcome").hidden = true; break;
    case "cta-example": {
      const inp = $("#cta-input");
      inp.value = d.text;
      inp.focus();
      break;
    }
    case "cta-open-session": toast("workspace session opened — ws-acme · partition:persist:ws-acme (mock)", "success"); break;
    case "cta-create-terminal": toast("terminal created — bash in " + ENVS[state.env].term + " (mock)", "success"); break;
    case "cta-open-folder": toast("baseline Code OSS command — File: Open Folder…", "info"); break;

    /* toasts */
    case "toast-dismiss": a.closest(".toast").remove(); break;
  }
}

/* ═══ 20. keyboard: palette, esc-chain, sidebar toggle ══════════════ */
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (palOpen) { closePalette(); } else { openPalette(); }
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
    e.preventDefault();
    document.body.classList.toggle("sb-collapsed");
    return;
  }
  if (e.key === "Escape") {
    if (!pop.hidden) { closePopover(); return; }
    if (palOpen) { closePalette(); return; }
    if (state.maximized) { toggleMaximize(state.maximized); return; }
  }
});

/* ═══ 21. inputs: enter-to-send handlers ═══════════════════════════ */
$("#new-task-input").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const v = e.target.value.trim();
  if (!v) return;
  state.tasks.unshift({ id: taskSeq, title: v, state: "queued", meta: "no agent" });
  e.target.value = "";
  renderTasks();
  toast(`Task <b>#${taskSeq}</b> created — queued (mock)`, "success");
  taskSeq++;
});

function wireAgentInput(id, k) {
  $(id).addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const v = e.target.value.trim();
    if (!v) return;
    appendMsg(k, "user", esc(v));
    e.target.value = "";
    setTimeout(() => appendMsg(k, "agent", cannedReply()), 650);
  });
}
wireAgentInput("#agent-msg", "a");
wireAgentInput("#agent-msg-b", "b");

$("#cta-input").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const v = e.target.value.trim();
  if (!v) return;
  e.target.value = "";
  toast(`Goal received: “${esc(v)}” — spawning agent + sandbox (mock)`, "success");
});

/* map-to-Code-OSS toggle */
$("#map-toggle").addEventListener("change", (e) => {
  const on = e.target.checked;
  document.body.classList.toggle("map-on", on);
  toast(on ? "Code OSS map <b>ON</b> — regions pinned to source paths" : "Code OSS map OFF", "info");
});

/* ═══ 22. init ═════════════════════════════════════════════════════ */
applyPositions();
renderTasks();
renderResources();
renderTerminal(false);
buildMinimap();
setAgentTab("a");
setEditorTab("page.tsx");
setView("tasks");
refreshSbAgents();
