---
title: "Agent guides"
type: agent
status: draft
canon: true
updated: 2026-08-27
---

# Agent guides

Маршрутизатор «задача → skill → guide → инструмент». Выбирать минимальный набор skills; skill не переопределяет canon; model selection — только через `.studio/models.json` / `pnpm studio:route`. Реестр скиллов: `.studio/skill-map.json`; planned-скиллы активируются после создания.

| Задача | Primary skill | Guide | Primary tool |
|---|---|---|---|
| architecture / authority / R3 | runtime-architecture | [ARCHITECT-AGENT](ARCHITECT-AGENT.md) | Studio/docs |
| Game Core | runtime-implement | [CORE-AGENT](CORE-AGENT.md) | tests (gamectl planned) |
| content | runtime-content | [CONTENT-AGENT](CONTENT-AGENT.md) | content compiler checks + `pnpm gamectl content validate`, `pnpm gamectl catalog` |
| UI | runtime-ui | [UI-AGENT](UI-AGENT.md) | Storybook |
| test authoring / repro | runtime-qa | [QA-AGENT](QA-AGENT.md) | relevant runner + [VERIFICATION-TIERS](../engineering/VERIFICATION-TIERS.md) |
| independent testing | runtime-test | [QA-AGENT](QA-AGENT.md) | read-only, `pnpm studio:route --test` |
| independent review | runtime-review | [ARCHITECT-AGENT](ARCHITECT-AGENT.md)/[QA-AGENT](QA-AGENT.md) | read-only, `pnpm studio:route --review` |
| Orca coordination | runtime-producer | `.studio/producer.md`, `gamestudio/ORCA.md` | orca orchestration |

Planned domain pairs (skill появляется одновременно с командами/контрактами): balance → BALANCE-AGENT + gamectl balance; scenario → SCENARIO-AGENT + graph analyzer; simulation/repro → SIMULATION-AGENT + gamectl simulate/replay; persistence → PERSISTENCE-AGENT + gamectl save; harness/tooling → HARNESS-AGENT + Studio/Nx/gamectl. Красная команда: [RED-TEAM-AGENT](RED-TEAM-AGENT.md).

## Список гайдов

- [Agent Workflow](AGENT-WORKFLOW.md)
- [Architect Agent](ARCHITECT-AGENT.md)
- [Core Agent](CORE-AGENT.md)
- [Content Agent](CONTENT-AGENT.md)
- [UI Agent](UI-AGENT.md)
- [QA Agent](QA-AGENT.md)
- [Red Team Agent](RED-TEAM-AGENT.md)
