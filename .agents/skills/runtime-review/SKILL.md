---
name: runtime-review
description: Independently review a Runtime Human diff against task acceptance, canon, architecture, determinism, compatibility, tests and scope discipline without editing it.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human independent review

Use a fresh context. Read the original task, relevant canon and the diff; do not rely on the implementer's narrative as evidence.

Prioritize: authority/state ownership, deterministic replay/idempotency, save/schema compatibility, stable IDs/provenance, dependency boundaries, security/Tauri permissions, missing negative-path tests, UI accessibility and scope expansion.

Report only actionable findings with severity and exact paths/evidence. Finish with acceptance criteria marked supported/not-supported/uncertain. Do not edit during review.
