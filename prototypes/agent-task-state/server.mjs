#!/usr/bin/env node
// =============================================================================
// Flauz Wave 2 — Worker E — Charter prototype #6: AGENT TASK STATE
//
// Zero-install (Node >= 20, no npm deps) server that:
//   - serves the timeline UI (index.html / app.js / styles.css)
//   - exposes the task-state API used by the UI:
//       GET  /api/tasks              -> the .flauz/tasks.json envelope
//       POST /api/tasks/:id/events   -> validate + apply a state transition
//       POST /api/tasks/reset        -> re-seed the demo tasks
//   - persists the envelope to ./.flauz/tasks.json (DL-9/D-9 rehearsal:
//     workspace-committed, git-diffable shareable artifact)
//
// State machine (mirrors the native surfaces — see README.md):
//   plan --submit-plan--> awaiting-approval --approve--> execute
//         awaiting-approval --request-changes--> plan
//   execute --report--> verify --verify-pass--> awaiting-signoff --sign-off--> done
//   verify --verify-fail--> execute ; execute/verify --fail--> failed
//   any active state --cancel--> cancelled
//
// Native surface mapping (reference tree @ 9bf9ae764da):
//   states        <-> ChatSessionStatus (InProgress/NeedsInput/Completed/Failed)
//                    src/vscode-dts/vscode.proposed.chatSessionsProvider.d.ts:10-30
//   gates         <-> agentSessionApprovalModel (WaitingForConfirmation /
//                    WaitingForPostApproval -> NeedsInput)
//                    contrib/chat/browser/agentSessions/agentSessionApprovalModel.ts:120-158
//   verify + snapshots <-> chatEditingService.createSnapshot(requestId, stopId)
//                    contrib/chat/browser/chatEditing/chatEditingSession.ts:386-389
//   evidence rows <-> scmArtifactProvider.d.ts (groups + artifacts w/ timestamp+command)
//   timing        <-> ChatSessionItem.timing {created,lastRequestStarted,lastRequestEnded}
//
// Port is FIXED (4173) so the verification transcript is reproducible.
// =============================================================================

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 4173;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const ENVELOPE_DIR = path.join(DIR, '.flauz');
const ENVELOPE_FILE = path.join(ENVELOPE_DIR, 'tasks.json');

// --- the state machine --------------------------------------------------------
const TRANSITIONS = {
	'submit-plan':     { from: ['plan'],               to: 'awaiting-approval', actor: 'agent',  gate: 1 },
	'approve':         { from: ['awaiting-approval'],  to: 'execute',           actor: 'human', gate: 1 },
	'request-changes': { from: ['awaiting-approval'],  to: 'plan',              actor: 'human', gate: 1 },
	'report':          { from: ['execute'],            to: 'verify',            actor: 'agent' },
	'verify-pass':     { from: ['verify'],             to: 'awaiting-signoff',  actor: 'agent', gate: 2 },
	'verify-fail':     { from: ['verify'],             to: 'execute',           actor: 'agent' },
	'sign-off':        { from: ['awaiting-signoff'],   to: 'done',              actor: 'human', gate: 2 },
	'fail':            { from: ['execute', 'verify'],  to: 'failed',            actor: 'agent' },
	'cancel':          { from: ['plan', 'awaiting-approval', 'execute', 'verify', 'awaiting-signoff'], to: 'cancelled', actor: 'human' },
};

// ChatSessionStatus mapping (chatSessionsProvider.d.ts:10-30)
const CHAT_SESSION_STATUS = { failed: 0, completed: 1, inProgress: 2, needsInput: 3 };
function toChatSessionStatus(state) {
	if (state === 'done') return CHAT_SESSION_STATUS.completed;
	if (state === 'failed') return CHAT_SESSION_STATUS.failed;
	if (state === 'awaiting-approval' || state === 'awaiting-signoff') return CHAT_SESSION_STATUS.needsInput;
	return CHAT_SESSION_STATUS.inProgress; // plan | execute | verify
}

const GATE_STATES = { 'awaiting-approval': 1, 'awaiting-signoff': 2 };

// --- demo seed ----------------------------------------------------------------
function nowIso() { return new Date().toISOString(); }
function minutesAgo(m) { return new Date(Date.now() - m * 60_000).toISOString(); }

function seedEnvelope() {
	return {
		schema: 'flauz.tasks/v0',
		workspace: 'flauz-code-lab (demo)',
		updatedAt: nowIso(),
		notes: 'Envelope rehearsal for D-8/D-9 (workflow envelope + .flauz/ persistence). Private agent state stays in editor storage; this file is the shareable, git-diffable layer (DL-9).',
		tasks: [
			{
				id: 'T-001', title: 'Implement evidence ledger v0 writer', state: 'awaiting-approval',
				model: 'anthropic/claude-sonnet-4-5', createdAt: minutesAgo(42), updatedAt: minutesAgo(9),
				history: [
					{ seq: 1, at: minutesAgo(42), event: 'created', from: null, to: 'plan', actor: 'human', notes: 'Task opened from chat session', artifacts: [] },
					{ seq: 2, at: minutesAgo(31), event: 'submit-plan', from: 'plan', to: 'awaiting-approval', actor: 'agent', notes: 'Plan: write ledger entries to .flauz/evidence/ + SCM artifact rows; 3 files, ~120 LOC.', artifacts: [{ kind: 'plan', uri: '.flauz/plans/T-001.md' }] },
				],
			},
			{
				id: 'T-002', title: 'Verify browser pane policy gates', state: 'verify',
				model: 'openai/gpt-5-codex', createdAt: minutesAgo(120), updatedAt: minutesAgo(4),
				history: [
					{ seq: 1, at: minutesAgo(120), event: 'created', from: null, to: 'plan', actor: 'human', notes: '', artifacts: [] },
					{ seq: 2, at: minutesAgo(104), event: 'submit-plan', from: 'plan', to: 'awaiting-approval', actor: 'agent', notes: 'Drive example.com via browser tools; assert allowlist blocks non-allowed host at all layers.', artifacts: [{ kind: 'plan', uri: '.flauz/plans/T-002.md' }] },
					{ seq: 3, at: minutesAgo(96), event: 'approve', from: 'awaiting-approval', to: 'execute', actor: 'human', notes: 'Approved for ephemeral partition only.', artifacts: [] },
					{ seq: 4, at: minutesAgo(41), event: 'report', from: 'execute', to: 'verify', actor: 'agent', notes: 'Edits applied; checkpoint taken before changeset.', artifacts: [{ kind: 'changeset', files: 2, checkpoint: 'req-8/stop-1' }, { kind: 'screenshot', uri: '.flauz/evidence/T-002/blocked-nav.png' }] },
				],
			},
			{
				id: 'T-003', title: 'Draft .flauz/tasks.json schema docs', state: 'done',
				model: 'ollama/qwen3:14b', createdAt: minutesAgo(300), updatedAt: minutesAgo(60),
				history: [
					{ seq: 1, at: minutesAgo(300), event: 'created', from: null, to: 'plan', actor: 'human', notes: '', artifacts: [] },
					{ seq: 2, at: minutesAgo(281), event: 'submit-plan', from: 'plan', to: 'awaiting-approval', actor: 'agent', notes: 'Local model; docs only.', artifacts: [] },
					{ seq: 3, at: minutesAgo(277), event: 'approve', from: 'awaiting-approval', to: 'execute', actor: 'human', notes: '', artifacts: [] },
					{ seq: 4, at: minutesAgo(150), event: 'report', from: 'execute', to: 'verify', actor: 'agent', notes: 'docs/envelope.md written.', artifacts: [{ kind: 'changeset', files: 1, checkpoint: 'req-3/stop-0' }] },
					{ seq: 5, at: minutesAgo(140), event: 'verify-pass', from: 'verify', to: 'awaiting-signoff', actor: 'agent', notes: 'Schema lint + examples round-trip.', artifacts: [] },
					{ seq: 6, at: minutesAgo(60), event: 'sign-off', from: 'awaiting-signoff', to: 'done', actor: 'human', notes: 'Merged.', artifacts: [] },
				],
			},
		],
	};
}

// --- envelope IO ----------------------------------------------------------------
async function loadEnvelope() {
	if (!existsSync(ENVELOPE_FILE)) return seedEnvelope();
	try {
		return JSON.parse(await readFile(ENVELOPE_FILE, 'utf8'));
	} catch { return seedEnvelope(); }
}
async function saveEnvelope(env) {
	env.updatedAt = nowIso();
	await mkdir(ENVELOPE_DIR, { recursive: true });
	await writeFile(ENVELOPE_FILE, JSON.stringify(env, null, 2) + '\n');
}

// --- transition application ------------------------------------------------------
function applyEvent(env, taskId, event, notes) {
	const task = env.tasks.find(t => t.id === taskId);
	if (!task) return { error: 404, message: `unknown task ${taskId}` };
	const tr = TRANSITIONS[event];
	if (!tr) return { error: 400, message: `unknown event '${event}'` };
	if (!tr.from.includes(task.state)) {
		return { error: 409, message: `event '${event}' invalid from state '${task.state}' (allowed from: ${tr.from.join(', ')})` };
	}
	const from = task.state;
	task.state = tr.to;
	task.updatedAt = nowIso();
	const seq = (task.history.at(-1)?.seq ?? 0) + 1;
	const artifacts = [];
	if (event === 'report') artifacts.push({ kind: 'changeset', files: 1 + Math.floor(Math.random() * 3), checkpoint: `req-${seq}/stop-0` });
	if (event === 'verify-pass') artifacts.push({ kind: 'evidence', uri: `.flauz/evidence/${task.id}/verify.json` });
	task.history.push({ seq, at: nowIso(), event, from, to: tr.to, actor: tr.actor, notes: notes ?? '', artifacts });
	return { task };
}

// --- tiny static file server + JSON API -------------------------------------------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

async function readBody(req) {
	let body = '';
	for await (const chunk of req) body += chunk;
	try { return body ? JSON.parse(body) : {}; } catch { return null; }
}
function json(res, code, obj) {
	res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
	res.end(JSON.stringify(obj));
}

const server = createServer(async (req, res) => {
	const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
	const route = `${req.method} ${url.pathname}`;

	try {
		if (route === 'GET /api/tasks') {
			return json(res, 200, await loadEnvelope());
		}
		if (route === 'POST /api/tasks/reset') {
			const env = seedEnvelope();
			await saveEnvelope(env);
			return json(res, 200, env);
		}
		const evMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/events$/);
		if (evMatch && req.method === 'POST') {
			const body = await readBody(req);
			if (body === null) return json(res, 400, { error: 400, message: 'invalid JSON body' });
			const env = await loadEnvelope();
			const result = applyEvent(env, decodeURIComponent(evMatch[1]), String(body.event ?? ''), body.notes ? String(body.notes) : '');
			if (result.error) return json(res, result.error, result);
			await saveEnvelope(env);
			console.log(`[api] ${evMatch[1]} ${body.event}: ${result.task.history.at(-1).from} -> ${result.task.state}`);
			return json(res, 200, result);
		}

		// static assets
		let file = url.pathname === '/' ? '/index.html' : url.pathname;
		file = file.replace(/\/+$/, '') || '/index.html';
		if (file.includes('..')) { res.writeHead(400); return res.end('bad path'); }
		const full = path.join(DIR, file);
		if (!existsSync(full)) { res.writeHead(404); return res.end('not found'); }
		const data = await readFile(full);
		res.writeHead(200, { 'content-type': MIME[path.extname(full)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
		return res.end(data);
	} catch (err) {
		console.error('[api] error', err);
		return json(res, 500, { error: 500, message: String(err?.message ?? err) });
	}
});

server.listen(PORT, '127.0.0.1', () => {
	console.log(`[agent-task-state] serving http://127.0.0.1:${PORT}  (envelope: ${path.relative(DIR, ENVELOPE_FILE)})`);
	console.log('[agent-task-state] Ctrl+C to stop');
});
