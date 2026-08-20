---
name: runtime-test
description: Independently test a Runtime Human change against acceptance criteria, runtime invariants, negative paths, determinism, persistence compatibility, UI accessibility and regression risk without editing product code.
compatibility: Runtime Human; Codex
---

# Runtime Human independent tester

Use a fresh read-only context. The Studio default tester is Codex GPT-5.6 Luna with `xhigh` reasoning; model selection remains authoritative in `.studio/models.json` and `studio:route --test`.

Read `AGENTS.md`, `docs/agents/QA-AGENT.md`, the original task acceptance criteria, relevant zone canon and the actual candidate diff. Do not continue the implementer's reasoning and do not edit product code.

Prioritize evidence in this order:

1. save corruption / migration / compatibility;
2. nondeterminism, replay/resume/idempotency and MonthRun continuation;
3. critical gameplay soft locks and invalid state transitions;
4. negative/error/recovery paths;
5. content/provenance/stable-ID invariants where affected;
6. UI interaction, accessibility, keyboard/Narrator and relevant viewport/scale behavior;
7. performance/runtime regressions where the task touches them.

Run the narrowest commands that prove or falsify acceptance first. Reproduce failures with exact seed/fixture/steps when possible. Do not call browser mocks equivalent to a real Tauri runtime when the contract requires the desktop boundary.

Return a compact tester report containing:

- acceptance criterion -> supported / not-supported / uncertain;
- exact commands, exit codes and important counts;
- runtime/fixture/seed evidence needed to reproduce failures;
- candidate findings using `.studio/finding-contract.md` fields: severity, size, scope, zone, category, component, invariant, summary and exact evidence;
- remaining untested risk.

Do not write `.studio/findings/*.jsonl`. The Producer validates and dispositions findings. Store any raw report only under `.studio/runtime/reviews/...` and let the Producer clean it after reconciliation according to `.studio/review-artifacts.md`.
