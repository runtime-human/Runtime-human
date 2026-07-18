---
title: "Proposed ADR decision sheet"
type: plan
status: draft
canon: true
depends_on: [ADR-004, ADR-005, ADR-006, ADR-007, ADR-008, ADR-009, ADR-010]
updated: 2026-07-18
---

# Proposed ADR decision sheet

Этот файл используется владельцем проекта при review PR.

| ADR | Решение | Рекомендация техлида | Статус до review |
|---|---|---|---|
| ADR-004 Persistence boundary | Rust authoritative repository | принять после prototype | Proposed |
| ADR-005 Suspended MonthRun | отдельный draft | принять | Proposed |
| ADR-006 Numeric model | bigint/i64/fixed point | принять | Proposed |
| ADR-007 Determinism manifest | versioned primitives | принять | Proposed |
| ADR-008 Desktop E2E | Playwright + WebdriverIO | принять | Proposed |
| ADR-009 Narrative Director | отдельный pacing layer | принять | Proposed |
| ADR-010 Save consistency | full save month boundary | принять | Proposed |

## Review commands

Для каждого ADR выбрать:

- Accept;
- Reject;
- Revise;
- Defer until prototype.

После решения обновить status/date/consequences, ADR index, master architecture и профильные спецификации.