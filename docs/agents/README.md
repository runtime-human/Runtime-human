---
title: "Agent guides"
type: agent
status: draft
canon: true
updated: 2026-08-27
---

# Agent guides

Маршрутизатор «задача → skill → guide → инструмент». Выбирать минимальный набор skills; skill не переопределяет canon; model selection — только через `.studio/models.json` / `pnpm studio:route`. Реестр скиллов: `.studio/skill-map.json`; planned-скиллы активируются только после появления их реальных команд/контрактов.

| Задача | Primary skill | Guide / contract | Primary tool |
|---|---|---|---|
| architecture / authority / R3 | runtime-architecture | [ARCHITECT-AGENT](ARCHITECT-AGENT.md) | Studio/docs |
| Game Core | runtime-implement | [CORE-AGENT](CORE-AGENT.md) | focused tests + `gamectl` impact/simulate/replay when applicable |
| content | runtime-content | [CONTENT-AGENT](CONTENT-AGENT.md) | content compiler checks + `pnpm gamectl content validate`, `pnpm gamectl catalog` |
| balance tuning | runtime-balance | [BALANCE-LAYER](../engineering/BALANCE-LAYER.md) | `pnpm balance:check` + simulation compare/explain as applicable |
| deterministic simulation / repro / replay | runtime-simulation | [GAMECTL](../engineering/GAMECTL.md) | `gamectl simulate`, `fixture`, `replay`, `explain` + fast-check properties |
| UI | runtime-ui | [UI-AGENT](UI-AGENT.md) | Storybook + browser evidence; MCP is development-only |
| Studio / Nx / gamectl / Storybook agent tooling | runtime-harness | [AI-FIRST-GAME-DEVELOPMENT](../architecture/AI-FIRST-GAME-DEVELOPMENT.md) + [VERIFICATION-TIERS](../engineering/VERIFICATION-TIERS.md) | Studio/Nx/gamectl/Storybook tooling |
| test authoring / repro | runtime-qa | [QA-AGENT](QA-AGENT.md) | relevant runner + [VERIFICATION-TIERS](../engineering/VERIFICATION-TIERS.md) |
| independent testing | runtime-test | [QA-AGENT](QA-AGENT.md) | read-only, `pnpm studio:route --test` |
| independent review | runtime-review | [ARCHITECT-AGENT](ARCHITECT-AGENT.md)/[QA-AGENT](QA-AGENT.md) | read-only, `pnpm studio:route --review` |
| Orca coordination | runtime-producer | `.studio/producer.md`, `gamestudio/ORCA.md` | Orca orchestration |

Planned domain pairs remain intentionally unavailable until their implementation wave lands: scenario → `runtime-scenario` + typed scenario analyzer/`gamectl scenario`; persistence → `runtime-persistence` + Rust-owned read-only save inspector/`gamectl save`. Do not route workers to a planned skill merely because its name appears in the architecture plan. Красная команда: [RED-TEAM-AGENT](RED-TEAM-AGENT.md).

`pnpm studio:evaluate -- --change-class <id> --risk <risk>` is a **shadow-mode** evaluator-cost planner. Until `.studio/verification-policy.json` is explicitly activated after measured evidence, it is advisory only and cannot replace tester/reviewer requirements from the Producer contract.

## Список гайдов

- [Agent Workflow](AGENT-WORKFLOW.md)
- [Architect Agent](ARCHITECT-AGENT.md)
- [Core Agent](CORE-AGENT.md)
- [Content Agent](CONTENT-AGENT.md)
- [UI Agent](UI-AGENT.md)
- [QA Agent](QA-AGENT.md)
- [Red Team Agent](RED-TEAM-AGENT.md)
