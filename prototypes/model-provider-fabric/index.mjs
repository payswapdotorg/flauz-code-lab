#!/usr/bin/env node
// =============================================================================
// Flauz Wave 2 — Worker E — Charter prototype #3: MODEL PROVIDER FABRIC
//
// Zero-install (Node >= 20, no npm deps). Proves the multi-model abstraction
// layer (D-2 / DL-3) against the exact semantics of the reference tree
// (payswapdotorg/Flauz @ 9bf9ae764da):
//
//   - selector semantics mirror src/vs/workbench/contrib/chat/common/languageModels.ts:1412-1435
//     (strict `===` on vendor/family/version/id; `undefined` = wildcard; empty
//     selector resolves ALL vendors and returns every cached model; no matches
//     => []; the historical "illegal open-ended selector" throw does NOT exist
//     at this commit).
//   - vendor resolution may activate provider extensions
//     (onLanguageModelChatProvider:<vendor>) — mirrored here as a one-time
//     activation cost, then cached (languageModels.ts:1223-1244).
//   - model metadata mirrors vscode.d.ts LanguageModelChat (20242-20312) and
//     pricing metadata mirrors vscode.proposed.languageModelPricing.d.ts
//     (pricing label, inputCost/outputCost per 1M tokens, priceCategory,
//     category).
//   - registerLanguageModelChatProvider shape mirrored from vscode.d.ts:20844-20851
//     ("vendor ... must be globally unique").
//
// Deterministic: seeded PRNG (mulberry32) => identical numbers on every run,
// so the captured transcript is reproducible evidence.
//
//   Usage: node index.mjs [--seed 1337] [--json out/run-report.json]
// =============================================================================

import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { values: argv } = parseArgs({
        options: {
                seed: { type: 'string', default: '1337' },
                json: { type: 'string', default: 'out/run-report.json' },
        },
});

// --- deterministic PRNG ------------------------------------------------------
function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
                a |= 0; a = (a + 0x6D2B79F5) | 0;
                let t = Math.imul(a ^ (a >>> 15), 1 | a);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
}
const rand = mulberry32(Number(argv.seed) || 1337);

// --- mock model registry (metadata shapes mirror the tree; numbers are mock) --
// Pricing fields = vscode.proposed.languageModelPricing.d.ts names.
const REGISTRY = [
        {
                // LanguageModelChat fields (vscode.d.ts:20242-20312)
                name: 'Codex (GPT-5-Codex)',
                id: 'gpt-5-codex',
                vendor: 'openai',
                family: 'gpt-5-codex',
                version: '2025-09',
                maxInputTokens: 400_000,
                // languageModelPricing.d.ts fields
                pricing: '$1.25/$10.00 per 1M tokens',
                inputCost: 1.25,
                outputCost: 10.0,
                cacheCost: 0.31,
                cacheWriteCost: 1.25,
                priceCategory: 'high',
                category: 'powerful',
                // mock transport profile (deterministic)
                profile: { ttfbMs: 240, msPerChunk: 55, chunks: 4, verbosity: 1.0 },
        },
        {
                name: 'Claude Sonnet 4.5',
                id: 'claude-sonnet-4-5',
                vendor: 'anthropic',
                family: 'claude-sonnet-4.5',
                version: '2025-10',
                maxInputTokens: 200_000,
                pricing: '$3.00/$15.00 per 1M tokens',
                inputCost: 3.0,
                outputCost: 15.0,
                cacheCost: 0.3,
                cacheWriteCost: 3.75,
                priceCategory: 'high',
                category: 'powerful',
                profile: { ttfbMs: 420, msPerChunk: 70, chunks: 3, verbosity: 1.15 },
        },
        {
                name: 'Qwen3 Coder Plus',
                id: 'qwen3-coder-plus',
                vendor: 'qwen',
                family: 'qwen3-coder',
                version: '2025-08',
                maxInputTokens: 262_144,
                pricing: '$0.35/$1.25 per 1M tokens',
                inputCost: 0.35,
                outputCost: 1.25,
                cacheCost: 0.09,
                cacheWriteCost: 0.35,
                priceCategory: 'low',
                category: 'versatile',
                profile: { ttfbMs: 310, msPerChunk: 45, chunks: 4, verbosity: 0.95 },
        },
        {
                name: 'Muse Coder 1',
                id: 'muse-coder-1',
                vendor: 'muse',
                family: 'muse-coder',
                version: '2025-04',
                maxInputTokens: 128_000,
                pricing: '$0.10/$0.40 per 1M tokens',
                inputCost: 0.10,
                outputCost: 0.4,
                cacheCost: 0.02,
                cacheWriteCost: 0.10,
                priceCategory: 'low',
                category: 'lightweight',
                profile: { ttfbMs: 260, msPerChunk: 40, chunks: 3, verbosity: 0.8 },
        },
        {
                name: 'Copilot GPT-5 (subscription)',
                id: 'copilot-gpt-5',
                vendor: 'copilot',
                family: 'gpt-5',
                version: '2025-09',
                maxInputTokens: 272_000,
                pricing: 'Included with Copilot subscription', // display-label only
                inputCost: undefined,
                outputCost: undefined,
                priceCategory: 'medium',
                category: 'versatile',
                profile: { ttfbMs: 380, msPerChunk: 60, chunks: 3, verbosity: 1.0 },
        },
        {
                name: 'Qwen3 14B (local, Ollama)',
                id: 'qwen3:14b',
                vendor: 'ollama',
                family: 'qwen3',
                version: '2025-07',
                maxInputTokens: 32_768,
                pricing: 'Free (local)',
                inputCost: 0,
                outputCost: 0,
                priceCategory: 'low',
                category: 'lightweight',
                profile: { ttfbMs: 650, msPerChunk: 140, chunks: 3, verbosity: 0.9 },
        },
];

// --- mock provider extensions (registerLanguageModelChatProvider, vscode.d.ts:20844-20851)
const PROVIDER_EXTENSIONS = [
        { extensionId: 'flauz-models.openai', vendor: 'openai', activationMs: 90 },
        { extensionId: 'flauz-models.anthropic', vendor: 'anthropic', activationMs: 110 },
        { extensionId: 'flauz-models.qwen', vendor: 'qwen', activationMs: 70 },
        { extensionId: 'flauz-models.muse', vendor: 'muse', activationMs: 60 },
        { extensionId: 'github.copilot-chat', vendor: 'copilot', activationMs: 130 },
        { extensionId: 'flauz-models.ollama', vendor: 'ollama', activationMs: 50 },
];

// --- the fabric: mirrors languageModels.ts (vendor registry + model cache) ---
const vendors = new Map(PROVIDER_EXTENSIONS.map(p => [p.vendor, p]));
const modelCache = new Map(); // internalModelIdentifier -> model
const resolvedVendors = new Set();
const activationLog = [];

function internalId(model) { return `${model.vendor}/${model.id}`; }

// mirrors languageModels.ts:1223-1244 _resolveAllLanguageModels(vendorId, silent)
function resolveAllLanguageModels(vendorId) {
        const vendor = vendors.get(vendorId);
        if (!vendor) return;
        let provider = modelCache.has(vendorId); // "provider already registered" shortcut
        if (!provider && !resolvedVendors.has(vendorId)) {
                // first resolution => activate onLanguageModelChatProvider:<vendor>
                const t0 = performance.now();
                const sleepMs = vendor.activationMs; // simulated activation work
                activationLog.push({
                        event: `onLanguageModelChatProvider:${vendorId}`,
                        extension: vendor.extensionId,
                        activationMs: Number(sleepMs.toFixed(1)),
                        // real wall time is instant here; the SIMULATED cost is what the
                        // transcript records (deterministic), matching the tree's semantics
                        simulated: true,
                });
                resolvedVendors.add(vendorId);
                provider = true;
                void t0; void sleepMs;
        }
        if (!provider) return;
        for (const model of REGISTRY) {
                if (model.vendor === vendorId && !modelCache.has(internalId(model))) {
                        modelCache.set(internalId(model), model);
                }
        }
}

// mirrors languageModels.ts:1412-1435 selectLanguageModels(selector) — VERBATIM semantics
function selectChatModels(selector = {}) {
        if (selector.vendor) {
                resolveAllLanguageModels(selector.vendor);
        } else {
                const allVendors = Array.from(vendors.keys());
                for (const vendor of allVendors) resolveAllLanguageModels(vendor);
        }
        const result = [];
        for (const [id, model] of modelCache) {
                if ((selector.vendor === undefined || model.vendor === selector.vendor)
                        && (selector.family === undefined || model.family === selector.family)
                        && (selector.version === undefined || model.version === selector.version)
                        && (selector.id === undefined || model.id === selector.id)) {
                        result.push(model);
                }
        }
        return result;
}

// --- mock tokenizer + sendRequest (LanguageModelChat.sendRequest, vscode.d.ts:20302)
function countTokens(text) { return Math.max(1, Math.ceil(text.length / 4)); }

function mockSendRequest(model, prompt) {
        const inTokens = countTokens(prompt);
        const p = model.profile;
        const outTokens = Math.max(40, Math.round(inTokens * 4.5 * p.verbosity * (0.9 + rand() * 0.2)));
        const ttfb = Math.round(p.ttfbMs * (0.9 + rand() * 0.25));
        const streamMs = Math.round(p.msPerChunk * p.chunks * (0.85 + rand() * 0.3));
        const latencyMs = ttfb + streamMs;

        const inCost = (model.inputCost ?? 0) * inTokens / 1e6;
        const outCost = (model.outputCost ?? 0) * outTokens / 1e6;
        const metered = model.inputCost === undefined && model.outputCost === undefined
                ? 'unmetered (subscription — pricing label only)'
                : (model.inputCost === 0 && model.outputCost === 0)
                        ? 'free (local)'
                        : 'metered';

        const reply = `[${model.id}] ${prompt.trim().split(/\s+/).slice(0, 6).join(' ')} … — ${outTokens} tokens of mock output over ${p.chunks} streamed chunks.`;

        return {
                model: internalId(model),
                name: model.name,
                selectorMatch: `${JSON.stringify({ vendor: model.vendor, family: model.family })}`,
                latencyMs,
                ttfbMs: ttfb,
                inTokens, outTokens,
                inCost, outCost,
                totalCost: inCost + outCost,
                costFormula: `${inTokens}tok×$${model.inputCost ?? 0}/1M + ${outTokens}tok×$${model.outputCost ?? 0}/1M`,
                metered,
                tokensPerSec: Number((outTokens / (latencyMs / 1000)).toFixed(1)),
                replyPreview: reply,
        };
}

// --- render helpers -----------------------------------------------------------
const W = process.stdout.columns || 100;
function line(ch = '─') { console.log(ch.repeat(Math.min(W, 100))); }
function h1(t) { line('═'); console.log(t.toUpperCase()); line('═'); }
function h2(t) { console.log(); line(); console.log('## ' + t); line(); }
const usd = n => (n === 0 ? '$0.000000' : '$' + n.toFixed(6));

// =============================================================================
// RUN
// =============================================================================
const PROMPT_COMPLEX = 'Draft the release notes for the evidence ledger v0 from the merged chat-editing changesets and the .flauz/tasks.json envelope.';
const PROMPT_LIGHT = 'Summarize the watcher exclude defaults for .flauz/evidence.';

const report = { seed: argv.seed, generatedAt: new Date().toISOString(), registry: [], selectorMatrix: [], routing: [], activationLog };

h1('Flauz — model provider fabric (charter prototype #3)');
console.log(`zero-install Node ${process.version} · seed ${argv.seed} · deterministic transcript`);
console.log('selector semantics mirror: languageModels.ts:1412-1435 @ 9bf9ae764da (strict ===, undefined=wildcard, empty selector => all)');

h2('1) Model registry (' + REGISTRY.length + ' models, ' + new Set(REGISTRY.map(m => m.vendor)).size + ' vendors)');
console.log('internal id'.padEnd(30) + 'vendor'.padEnd(11) + 'family'.padEnd(18) + 'maxIn'.padEnd(9) + 'in$/1M'.padEnd(8) + 'out$/1M'.padEnd(8) + 'priceCat'.padEnd(10) + 'category');
for (const m of REGISTRY) {
        console.log(internalId(m).padEnd(30) + m.vendor.padEnd(11) + m.family.padEnd(18) + String(m.maxInputTokens).padEnd(9) + String(m.inputCost ?? '—').padEnd(8) + String(m.outputCost ?? '—').padEnd(8) + (m.priceCategory ?? '—').padEnd(10) + (m.category ?? '—'));
        report.registry.push({ ...m });
}

h2('2) Selector matrix (vscode.lm.selectChatModels semantics)');
const selectors = [
        ['{ }                      (omitted => all models)', {}],
        ["{ vendor: 'anthropic' }", { vendor: 'anthropic' }],
        ["{ family: 'gpt-5-codex' }", { family: 'gpt-5-codex' }],
        ["{ id: 'qwen3:14b' }", { id: 'qwen3:14b' }],
        ["{ vendor: 'copilot', family: 'gpt-5' }", { vendor: 'copilot', family: 'gpt-5' }],
        ["{ vendor: 'Anthropic' }   (case-sensitive => no match)", { vendor: 'Anthropic' }],
        ["{ id: 'gpt-4' }           (unknown id => no match)", { id: 'gpt-4' }],
];
for (const [label, sel] of selectors) {
        const models = selectChatModels(sel);
        const ids = models.map(internalId);
        console.log(`${label.padEnd(52)} -> ${ids.length} match(es)${ids.length ? ': ' + ids.join(', ') : ''}`);
        report.selectorMatrix.push({ selector: sel, matches: ids });
}
console.log('\nNOTE: empty selector returns ALL models (d.ts:20767 "When omitted all chat');
console.log('models are returned") — the old "illegal open-ended selector" throw does not');
console.log('exist at 9bf9ae7 (verified: languageModels.ts:1412-1435 has no such check).');

h2('3) Vendor resolution = provider-extension activation (one-time, then cached)');
selectChatModels({ vendor: 'anthropic' }); // first => activation
selectChatModels({ vendor: 'anthropic' }); // second => cached
for (const a of activationLog) {
        console.log(`activate ${a.event.padEnd(42)} by ${a.extension.padEnd(26)} +${a.activationMs}ms (one-time, simulated)`);
}
console.log('mirrors languageModels.ts:1223-1244: _resolveAllLanguageModels activates');
console.log('onLanguageModelChatProvider:<vendor> before provider.provideLanguageModelChatInfo —');
console.log('=> Flauz pre-warms vendors at service handshake (PERFORMANCE-PLAN §5.1).');

h2('4) Route one prompt to two models (per-model cost/latency accounting)');
const routes = [
        { label: "route A: { vendor: 'anthropic' }", selector: { vendor: 'anthropic' } },
        { label: "route B: { family: 'gpt-5-codex' }", selector: { family: 'gpt-5-codex' } },
];
console.log(`prompt (${countTokens(PROMPT_COMPLEX)} tok): "${PROMPT_COMPLEX.slice(0, 76)}…"`);
for (const r of routes) {
        const [model] = selectChatModels(r.selector);
        const res = mockSendRequest(model, PROMPT_COMPLEX);
        report.routing.push({ route: r.label, ...res });
        console.log();
        console.log(`  ${r.label}`);
        console.log(`    model      : ${res.name} (${res.model})`);
        console.log(`    latency    : ${res.latencyMs} ms (ttfb ${res.ttfbMs} ms + stream) · ${res.tokensPerSec} tok/s`);
        console.log(`    tokens     : in ${res.inTokens} · out ${res.outTokens}`);
        console.log(`    cost       : ${usd(res.totalCost)}  [${res.costFormula}]  (${res.metered})`);
        console.log(`    reply      : ${res.replyPreview}`);
}
const a = report.routing[0], b = report.routing[1];
console.log();
console.log(`  cross-model delta: ${((a.latencyMs - b.latencyMs) >= 0 ? '+' : '')}${a.latencyMs - b.latencyMs} ms · ${usd(a.totalCost - b.totalCost)}`);

h2('5) Flauz routing policy on top of the fabric (D-2 decoupling proof)');
function pickForTask(taskClass) {
        const all = selectChatModels({}); // resolve all vendors (cache-warm now)
        if (taskClass === 'light') {
                const c = all.filter(m => m.priceCategory === 'low').sort((x, y) => (x.inputCost ?? 9e9) - (y.inputCost ?? 9e9));
                return [c[0], { reason: 'priceCategory=low, lowest inputCost' }];
        }
        const p = all.filter(m => m.category === 'powerful');
        return [p[0], { reason: 'category=powerful' }];
}
for (const [taskClass, prompt] of [['complex', PROMPT_COMPLEX], ['light', PROMPT_LIGHT]]) {
        const [model, why] = pickForTask(taskClass);
        const res = mockSendRequest(model, prompt);
        console.log(`task=${taskClass.padEnd(8)} -> ${internalId(model).padEnd(24)} (${why.reason})`);
        console.log(`            latency ${res.latencyMs} ms · cost ${usd(res.totalCost)} · ${res.metered}`);
        report.routing.push({ route: `policy:${taskClass}`, ...res });
}

h2('6) What this proves (D-2 / DL-3 multi-model decoupling)');
console.log('  1. The routing layer composes {vendor,family,version,id} selectors only —');
console.log('     no vendor-specific code paths; providers plug in via the provider');
console.log('     registry (registerLanguageModelChatProvider, vendor globally unique).');
console.log('  2. Cost/latency accounting hooks exist per request (in/out tokens, per-1M');
console.log('     costs from languageModelPricing.d.ts field names) — the Flauz ledger');
console.log('     consumes exactly this shape (C-21: upstream has no cross-agent');
console.log('     accounting; that is Flauz-layer value-add).');
console.log('  3. Unmetered entries (subscription/local) are first-class: pricing label');
console.log('     without per-token costs.');
console.log('  4. Vendor cold-start = activation cost — pre-warm at handshake.');

// --- JSON artifact ------------------------------------------------------------
const outPath = path.isAbsolute(argv.json) ? argv.json : path.join(path.dirname(fileURLToPath(import.meta.url)), argv.json);
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log();
line();
console.log(`run report written: ${path.relative(process.cwd(), outPath)} (committed as evidence)`);
line();
