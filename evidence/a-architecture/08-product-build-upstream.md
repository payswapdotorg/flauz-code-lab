Evidence 08 — product.json, Build Layout, Upstream Packaging Points
product.json identity (stock, zero divergence)
$ rg -n "\"nameShort\"|\"nameLong\"" product.json→ "nameShort": "Code - OSS" / "nameLong": "Code - OSS"
extensionsGallery absence [VERIFY]
$ rg -n "extensionsGallery" product.json→ expected: no match (OSS builds ship without marketplace config). Re-run to confirm.  VSCodium patches Open VSX externally — precedent for Flauz's product.flauz.json approach.
Built-in extension packaging points
$ rg -n "builtInExtensions" product.json→ [VERIFY] key present in upstream product.json (used at build/packaging to pull external  built-ins — the no-in-tree-dirs packaging path in UPSTREAM-STRATEGY.md).$ rg -n "extensionEnabledApiProposals" product.json→ [VERIFY] key present (per-extension proposed-API gating; UPSTREAM-FRIENDLY proposed-API use).
Build layout (packaging fork target = build/flauz/, never build/lib)
$ ls build→ gulpfile.js  lib/  filters/  ... (full build pipeline; NEVER run in worker sandboxes,  per work-order §2)$ ls build/lib | head→ (compilation/packaging helpers — upstream churn zone, keep unmodified)
