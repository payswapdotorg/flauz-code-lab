// Flauz agent-task-state — timeline UI (prototype #6). Vanilla JS, no deps.
//
// Talks to the same API shape served by server.mjs (GET /api/tasks,
// POST /api/tasks/:id/events, POST /api/tasks/reset). When no API is present
// (static host, e.g. the sandbox preview), falls back to a localStorage-backed
// simulation with the SAME transition table (server.mjs stays the reference
// implementation; the fallback exists so the preview host shows the full UI).

const TRANSITIONS = {
	'submit-plan':     { from: ['plan'],               to: 'awaiting-approval', actor: 'agent' },
	'approve':         { from: ['awaiting-approval'],  to: 'execute',           actor: 'human' },
	'request-changes': { from: ['awaiting-approval'],  to: 'plan',              actor: 'human' },
	'report':          { from: ['execute'],            to: 'verify',            actor: 'agent' },
	'verify-pass':     { from: ['verify'],             to: 'awaiting-signoff',  actor: 'agent' },
	'verify-fail':     { from: ['verify'],             to: 'execute',           actor: 'agent' },
	'sign-off':        { from: ['awaiting-signoff'],   to: 'done',              actor: 'human' },
	'fail':            { from: ['execute', 'verify'],  to: 'failed',            actor: 'agent' },
	'cancel':          { from: ['plan', 'awaiting-approval', 'execute', 'verify', 'awaiting-signoff'], to: 'cancelled', actor: 'human' },
};

const CHAT_SESSION_STATUS = { failed: 0, completed: 1, inProgress: 2, needsInput: 3 };
function toChatSessionStatus(state) {
	if (state === 'done') return ['completed', CHAT_SESSION_STATUS.completed];
	if (state === 'failed') return ['failed', CHAT_SESSION_STATUS.failed];
	if (state === 'awaiting-approval' || state === 'awaiting-signoff') return ['needsinput', CHAT_SESSION_STATUS.needsInput];
	return ['inprogress', CHAT_SESSION_STATUS.inProgress];
}

const TL_STEPS = [
	{ key: 'plan', label: 'Plan' },
	{ key: 'gate-1', label: 'Approval', gate: true },
	{ key: 'execute', label: 'Execute' },
	{ key: 'verify', label: 'Verify' },
	{ key: 'gate-2', label: 'Sign-off', gate: true },
	{ key: 'done', label: 'Done' },
];

let mode = 'checking'; // 'live' | 'static'
let envelope = null;
const LS_KEY = 'flauz-tasks-v0';

// ---------- API layer (live server.mjs or localStorage fallback) -----------
async function apiGet() {
	if (mode === 'static') {
		return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') ?? seedFallback();
	}
	const r = await fetch('/api/tasks', { cache: 'no-store' });
	if (!r.ok) throw new Error(`GET /api/tasks -> ${r.status}`);
	return r.json();
}

async function apiEvent(taskId, event, notes) {
	if (mode === 'static') {
		const env = JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') ?? seedFallback();
		const task = env.tasks.find(t => t.id === taskId);
		const tr = TRANSITIONS[event];
		if (!task || !tr || !tr.from.includes(task.state)) {
			throw new Error(`event '${event}' invalid for ${taskId} (${task?.state})`);
		}
		task.history.push({ seq: (task.history.at(-1)?.seq ?? 0) + 1, at: new Date().toISOString(), event, from: task.state, to: tr.to, actor: tr.actor, notes: notes ?? '', artifacts: event === 'report' ? [{ kind: 'changeset', files: 1, checkpoint: 'sim' }] : [] });
		task.state = tr.to;
		task.updatedAt = new Date().toISOString();
		env.updatedAt = new Date().toISOString();
		localStorage.setItem(LS_KEY, JSON.stringify(env));
		return { task };
	}
	const r = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/events`, {
		method: 'POST', headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ event, notes }),
	});
	const body = await r.json().catch(() => ({}));
	if (!r.ok) throw new Error(body.message ?? `POST events -> ${r.status}`);
	return body;
}

async function apiReset() {
	if (mode === 'static') { localStorage.removeItem(LS_KEY); return seedFallback(); }
	const r = await fetch('/api/tasks/reset', { method: 'POST' });
	if (!r.ok) throw new Error(`reset -> ${r.status}`);
	return r.json();
}

function seedFallback() {
	// minimal fallback seed: one task per interesting state (static host only;
	// server.mjs seeds the full demo on first run / reset)
	const at = (m) => new Date(Date.now() - m * 60_000).toISOString();
	const mk = (id, title, state, model, hist) => ({ id, title, state, model, createdAt: at(90), updatedAt: at(1), history: hist });
	return {
		schema: 'flauz.tasks/v0', workspace: 'static-preview (simulated persistence)', updatedAt: new Date().toISOString(),
		tasks: [
			mk('T-001', 'Implement evidence ledger v0 writer', 'awaiting-approval', 'anthropic/claude-sonnet-4-5', [
				{ seq: 1, at: at(90), event: 'created', from: null, to: 'plan', actor: 'human', notes: '', artifacts: [] },
				{ seq: 2, at: at(60), event: 'submit-plan', from: 'plan', to: 'awaiting-approval', actor: 'agent', notes: 'static-host demo', artifacts: [] },
			]),
			mk('T-002', 'Verify browser pane policy gates', 'execute', 'openai/gpt-5-codex', [
				{ seq: 1, at: at(90), event: 'created', from: null, to: 'plan', actor: 'human', notes: '', artifacts: [] },
				{ seq: 2, at: at(70), event: 'submit-plan', from: 'plan', to: 'awaiting-approval', actor: 'agent', notes: '', artifacts: [] },
				{ seq: 3, at: at(65), event: 'approve', from: 'awaiting-approval', to: 'execute', actor: 'human', notes: '', artifacts: [] },
			]),
			mk('T-003', 'Draft .flauz/tasks.json schema docs', 'done', 'ollama/qwen3:14b', [
				{ seq: 1, at: at(90), event: 'created', from: null, to: 'plan', actor: 'human', notes: '', artifacts: [] },
				{ seq: 2, at: at(80), event: 'submit-plan', from: 'plan', to: 'awaiting-approval', actor: 'agent', notes: '', artifacts: [] },
				{ seq: 3, at: at(75), event: 'approve', from: 'awaiting-approval', to: 'execute', actor: 'human', notes: '', artifacts: [] },
				{ seq: 4, at: at(50), event: 'report', from: 'execute', to: 'verify', actor: 'agent', notes: '', artifacts: [] },
				{ seq: 5, at: at(45), event: 'verify-pass', from: 'verify', to: 'awaiting-signoff', actor: 'agent', notes: '', artifacts: [] },
				{ seq: 6, at: at(30), event: 'sign-off', from: 'awaiting-signoff', to: 'done', actor: 'human', notes: '', artifacts: [] },
			]),
		],
	};
}

// ---------- rendering --------------------------------------------------------
const $tasks = document.getElementById('tasks');
const $mode = document.getElementById('mode-badge');
const $err = document.getElementById('error-banner');

function showError(msg) {
	$err.hidden = false;
	$err.textContent = `⚠ ${msg}`;
	setTimeout(() => { $err.hidden = true; }, 3500);
}

function fmtTime(iso) {
	const d = new Date(iso);
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}
function fmtAgo(iso) {
	const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
	if (s < 90) return 'just now';
	if (s < 3600) return `${Math.round(s / 60)}m ago`;
	return `${Math.round(s / 3600)}h ago`;
}

function timelineFor(task) {
	const ol = document.createElement('div');
	ol.className = 'timeline';
	const track = document.createElement('div');
	track.className = 'tl-track';
	ol.appendChild(track);

	// which states has this task visited (from history)?
	const visited = new Set(task.history.map(h => h.to));
	const terminal = task.state === 'failed' || task.state === 'cancelled';

	const progress = { plan: 0, 'awaiting-approval': 1, execute: 2, verify: 3, 'awaiting-signoff': 4, done: 5 };
	const cur = progress[task.state] ?? 0;

	TL_STEPS.forEach((step, i) => {
		if (i > 0) {
			const seg = document.createElement('div');
			seg.className = 'tl-seg' + (i <= cur ? ' done' : '');
			track.appendChild(seg);
		}
		const node = document.createElement('div');
		node.className = 'tl-node' + (step.gate ? ' gate' : '') + (i === cur ? ' active' : '') + (i < cur ? ' done' : '');
		if (terminal && i >= cur) node.classList.add('terminal');
		if (terminal && i === cur) node.classList.add('active');
		const dot = document.createElement('div');
		dot.className = 'tl-dot';
		dot.textContent = step.gate ? '◆' : String(i + 1);
		const label = document.createElement('div');
		label.className = 'tl-label';
		label.textContent = step.label;
		node.append(dot, label);
		track.appendChild(node);
	});

	if (terminal) {
		const seg = document.createElement('div'); seg.className = 'tl-seg done'; track.appendChild(seg);
		const node = document.createElement('div');
		node.className = 'tl-node terminal active';
		node.innerHTML = `<div class="tl-dot">✕</div><div class="tl-label">${task.state}</div>`;
		track.appendChild(node);
	}
	return ol;
}

function actionsFor(task) {
	const wrap = document.createElement('div');
	wrap.className = 'actions';
	const mkBtn = (event, label, cls, who) => {
		const b = document.createElement('button');
		b.type = 'button';
		b.className = `btn ${cls}`;
		b.textContent = label;
		b.title = `${event} — fired by ${who} (mirrors agentSessionApprovalModel gate semantics)`;
		b.addEventListener('click', () => fire(task.id, event));
		return b;
	};
	switch (task.state) {
		case 'plan': wrap.append(mkBtn('submit-plan', 'Submit plan', 'primary', 'agent')); break;
		case 'awaiting-approval':
			wrap.append(mkBtn('approve', '✓ Approve plan', 'gate', 'human'), mkBtn('request-changes', 'Request changes', '', 'human'));
			break;
		case 'execute':
			wrap.append(mkBtn('report', 'Report for verification', 'primary', 'agent'), mkBtn('fail', 'Mark failed', 'danger', 'agent'));
			cancelBtn(wrap, task);
			break;
		case 'verify':
			wrap.append(mkBtn('verify-pass', 'Verify ✓ pass', 'primary', 'agent/tool'), mkBtn('verify-fail', 'Verify ✗ fail (rework)', '', 'agent/tool'));
			cancelBtn(wrap, task);
			break;
		case 'awaiting-signoff':
			wrap.append(mkBtn('sign-off', '✓ Sign off', 'gate', 'human'));
			cancelBtn(wrap, task);
			break;
		default: {
			const done = document.createElement('span');
			done.className = 'who';
			done.textContent = `terminal state: ${task.state}`;
			wrap.append(done);
		}
	}
	function cancelBtn(w, t) {
		const spacer = document.createElement('span'); spacer.className = 'spacer';
		w.append(spacer, mkBtn('cancel', 'Cancel', 'danger', 'human'));
		void t;
	}
	return wrap;
}

function artifactsFor(task) {
	const wrap = document.createElement('div');
	wrap.className = 'artifacts';
	const last = [...task.history].reverse().find(h => h.artifacts?.length);
	for (const a of last?.artifacts ?? []) {
		const chip = document.createElement('span');
		chip.className = 'artifact';
		chip.innerHTML = `<span class="k">${a.kind}</span> ${a.uri ?? ''}${a.files ? ` (${a.files} file${a.files > 1 ? 's' : ''})` : ''}${a.checkpoint ? ` · checkpoint ${a.checkpoint}` : ''}`;
		wrap.appendChild(chip);
	}
	if (!wrap.children.length) {
		const chip = document.createElement('span');
		chip.className = 'artifact';
		chip.textContent = 'no artifacts yet';
		wrap.appendChild(chip);
	}
	return wrap;
}

function historyFor(task) {
	const det = document.createElement('details');
	det.className = 'history';
	const n = task.history.length;
	det.innerHTML = `<summary>History — ${n} event${n === 1 ? '' : 's'} (persisted in .flauz/tasks.json)</summary>`;
	const ul = document.createElement('ul');
	ul.className = 'history-log';
	for (const h of task.history) {
		const li = document.createElement('li');
		if (h.actor === 'human') li.classList.add('actor-human');
		li.innerHTML = `<span class="t">${fmtTime(h.at)}</span><span class="e">${h.event}</span><span class="m">${h.from ?? '∅'} → ${h.to}${h.notes ? ` · ${escapeHtml(h.notes)}` : ''}</span>`;
		ul.appendChild(li);
	}
	det.appendChild(ul);
	return det;
}

function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function render() {
	$tasks.replaceChildren();
	for (const task of envelope.tasks) {
		const card = document.createElement('article');
		card.className = 'task';
		card.setAttribute('data-task', task.id);

		const head = document.createElement('div');
		head.className = 'task-head';
		const [cls, statusNum] = toChatSessionStatus(task.state);
		head.innerHTML = `
			<span class="task-id">${task.id}</span>
			<span class="task-title">${escapeHtml(task.title)}</span>
			<span class="task-meta">
				<span class="state-badge ${cls}" title="maps to ChatSessionStatus">${task.state} · ${cls}(${statusNum})</span>
				<span class="model-chip" title="routed via vscode.lm selector (prototype #3)">${escapeHtml(task.model)}</span>
				<span class="task-timing" title="ChatSessionItem.timing analogue">created ${fmtAgo(task.createdAt)} · updated ${fmtAgo(task.updatedAt)}</span>
			</span>`;
		card.appendChild(head);

		const body = document.createElement('div');
		body.className = 'task-body';
		body.append(timelineFor(task), artifactsFor(task), actionsFor(task), historyFor(task));
		card.appendChild(body);
		$tasks.appendChild(card);
	}
}

async function fire(taskId, event) {
	try {
		const { task } = await apiEvent(taskId, event);
		// refresh whole envelope (authoritative state lives server-side)
		envelope = await apiGet();
		void task;
		render();
	} catch (e) {
		showError(e.message);
	}
}

async function boot() {
	// detect mode: is a tasks API present on this origin?
	try {
		const probe = await fetch('/api/tasks', { cache: 'no-store' });
		mode = probe.ok ? 'live' : 'static';
	} catch {
		mode = 'static';
	}
	$mode.textContent = mode === 'live' ? 'persistence: live (.flauz/tasks.json)' : 'persistence: simulated (static host)';
	$mode.classList.toggle('static', mode === 'static');

	try {
		envelope = await apiGet();
		render();
	} catch (e) {
		showError(`failed to load envelope: ${e.message}`);
	}

	document.getElementById('reset-btn').addEventListener('click', async () => {
		try {
			envelope = await apiReset();
			render();
		} catch (e) { showError(e.message); }
	});
}

boot();
