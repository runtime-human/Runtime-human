---
title: "REF-02B0 — January v2 content compatibility spike"
type: plan
status: draft
canon: false
depends_on: [ADR-021]
updated: 2026-10-16
---

# REF-02B0 — Compatibility spike before authoring v2 content

## Finding

The v1 content compiler partitions entries by `era/domain` and computes the
manifest `contentFingerprint` over all chunk descriptors and entry-point IDs.
Even adding a new `1990s/programming-v2` chunk **changes the global v1
manifest fingerprint** if it is included in the existing build. Keeping
`1990s/programming` chunk bytes unchanged is necessary but **not sufficient**
for v1 persisted-checkpoint compatibility.

Canonical legacy manifest (16 October 2026, prior to this slice):
`02518cba1617689d4ada48e4624e6dfc96175c1b363132db38d8e738b819739f`.

The v1 source roots and deployed artifacts remain unchanged. A pure
`inspectProtectedContentChunks` helper detects drift by comparing exact
compiled chunk **artifact bytes**, not just IDs. Regression tests prove:

1. Current three legacy source roots compile to the exact deployed
   `manifest.json` and both committed legacy chunk artifacts.
2. Appending an in-memory, reachable v2 content source using
   `domain: programming-v2` preserves both legacy chunks, **but changes the
   combined manifest**.
3. Compiling that v2 source independently produces a separate
   `1990s/programming-v2` chunk and does not require changing the legacy
   manifest at all.
4. Mutating a legacy entry, or placing a v2 entry in `programming`, trips
   the protected-chunk drift detector.

## Decision / next gate

REF-02B1 should author validated v2 presentation sources in an **independent
v2 build configuration, source roots and publication namespace**. Do not add
the v2 roots to `content/content.config.json`, alter
`apps/desktop/public/content/manifest.json` or replace the v1
`contentFingerprint`. A separate v2 manifest/fingerprint must be explicitly
bound to the new versioned scenario in REF-02C. Runtime switch-over must be
reviewed with the save/replay compatibility owner.

This spike uses an **in-memory compatibility probe**, not new player-facing
content, a production v2 bundle, or a change to the content authoring schema.
The v2 approach texts, truthfulness predicates, preview markers, Russian
localizations, two GW-BASIC listing variants and typed decision read model are
still required in REF-02B1/B2. January v1 fixtures must not be regenerated.

## Verification and rollback

`tests/january-v2-content-compatibility.test.ts` is registered in
`content-node` and runs with `pnpm check:fast`. GitHub-hosted V3 and
independent review are required before acceptance. Revert this isolated
helper/test/documentation PR to roll back; legacy content is unaffected.
