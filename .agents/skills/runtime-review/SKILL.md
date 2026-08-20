---
name: runtime-review
description: Independently review a Runtime Human diff against task acceptance, canon, architecture, determinism, compatibility, tests and scope discipline without editing it.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human independent review

Use a fresh context. Read the original task, relevant canon and the diff; do not rely on the implementer's narrative as evidence.

Prioritize: authority/state ownership, deterministic replay/idempotency, save/schema compatibility, stable IDs/provenance, dependency boundaries, security/Tauri permissions, missing negative-path tests, UI accessibility and scope expansion.

Remain read-only. Do not modify product code and do not write `.studio/findings/*`; the Producer is the ledger writer.

For each actionable finding, follow `.studio/finding-contract.md`: provide one stable failure class with severity (`S0..S4`), agent-work size (`XS..XL`), scope, zone, category, component, invariant, exact evidence, suggested disposition and reason. Several manifestations of one root failure class should be one candidate with multiple evidence points, not duplicate findings.

Keep impact and fix cost independent. A difficult fix can still be S0/S1; a large polish change can still be S4.

Finish with acceptance criteria marked supported/not-supported/uncertain. Do not edit during review.
