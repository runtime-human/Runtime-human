---
name: runtime-review
description: Independently review a Runtime Human diff against task acceptance, canon, architecture, determinism, compatibility, tests and scope discipline without editing it.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human independent review

Use a fresh context. The default R1/R2/R2_COMPLEX reviewer is Codex GPT-5.6 Luna with `xhigh` reasoning; effective R3 review stays on fresh Codex Sol high. GLM-5.3 is available as the explicit cross-family second opinion. Model selection is authoritative in `.studio/models.json` and `studio:route --review`; do not select a model from this prose.

Read the original task, relevant canon and the actual diff; do not rely on the implementer's narrative as evidence.

Prioritize: authority/state ownership, deterministic replay/idempotency, save/schema compatibility, stable IDs/provenance, dependency boundaries, security/Tauri permissions, missing negative-path tests, UI accessibility and scope expansion.

Remain read-only. Do not modify product code and do not write `.studio/findings/*`; the Producer is the ledger writer.

For each actionable finding, follow `.studio/finding-contract.md`: provide one stable failure class with severity (`S0..S4`), agent-work size (`XS..XL`), scope, zone, category, component, invariant, exact evidence, suggested disposition and reason. Several manifestations of one root failure class should be one candidate with multiple evidence points, not duplicate findings.

Keep impact and fix cost independent. A difficult fix can still be S0/S1; a large polish change can still be S4.

Write raw report material only under `.studio/runtime/reviews/...`. The Producer reconciles it into durable finding/decision/verification state and deletes the raw report according to `.studio/review-artifacts.md`.

Finish with acceptance criteria marked supported/not-supported/uncertain. Do not edit during review.
