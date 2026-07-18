---
title: "DATA-FLOW"
type: architecture
status: draft
canon: true
updated: 2026-07-18
---

# Потоки данных

Нормативные решения:

- [ADR-005 — Suspended MonthRun](../adr/ADR-005-suspended-month-run.md);
- [ADR-018 — Programmer Career, Hiring & Employment](../adr/ADR-018-authoritative-programmer-career-employment-model.md).

## Новый сейв

```text
UI form
→ CreateCharacterCommand
→ application validation
→ core factory
→ initial content resolution
→ empty CareerState before Phase 3
→ Rust persistence transaction
→ SaveSummary read model
→ UI
```

## Начало месяца

```text
UI month plan
→ BeginMonthCommand
→ load SaveGameState + active content fingerprints
→ validate revision and compatibility
→ deterministic MonthRunner
→ completed result OR pending decision
```

При pending decision создаётся `pending_month_run`; committed save не изменяется.

## Продолжение месяца

```text
Choice in UI
→ ResumeMonthCommand
→ load draft
→ verify revision/content/rules/manifest/checksum
→ apply decision once
→ continue deterministic pipeline from saved phase
```

Already materialized project/career state does not reroll.

## Career search

После открытия Career Slice:

```text
Career Intent
+ professional/history snapshot
+ access/life/current-employment snapshot
+ LaborMarketProfile
+ fictional employer/opportunity content
+ deterministic context
→ Candidate Signal Profile
→ 1–3 surfaced CareerOpportunity snapshots
→ routine search aggregate
→ Career read model
→ UI
```

Career does not expose hidden mastery directly to employer projection and does not generate a huge simulated vacancy population.

## Hiring

```text
Selected opportunity
→ create/resume HiringProcess
→ eligibility/signal projection
→ portfolio discussion or shared TechnicalSituation
→ optional Learning preparation
→ candidate approach
→ deterministic employer projection/outcome
→ offer / alternate / explained non-offer
```

Professional Challenge/Learning owners establish their own outcome. Interview does not automatically create production evidence.

## Offer acceptance

```text
AcceptEmploymentOfferCommand
→ validate active offer/expiry/revision
→ Career position proposal
→ Economy compensation proposal
→ Life schedule/capacity commitment proposal
→ cross-owner invariant validation
→ one atomic commit
→ Employment read model
```

Position cannot commit without matching compensation/schedule commitments.

## Employment month

```text
EmploymentPosition + context
→ routine work commitment
→ typed ProjectWorkRequest / LearningOpportunity / TechnicalSituation when relevant
→ owner outcomes and contribution summary
→ Career workplace trust/feedback/transition proposal
→ Progression interpretation only for eligible ExperienceEpisode
→ atomic month commit
```

Routine work, applications and salary do not create blocking modals.

## Career transition

```text
workplace history + readiness summary + trust
+ employer/company position/budget/policy signals
→ transition proposal
→ promotion / scope change / lateral / exit / layoff / dismissal
→ owner commitment updates
→ career history
```

Promotion does not award Professional Grade. Layoff/company cancellation does not become candidate capability failure.

## Commit месяца

```text
completed MonthRun
→ cross-owner invariant validation
→ BEGIN IMMEDIATE
→ compare save/entity revisions
→ write only implemented normalized deltas
→ append meaningful histories
→ write committed-run/idempotency markers
→ delete pending draft
→ increment save revision once
→ COMMIT
```

Touched Project/Career/Progression/Economy/Life changes commit together.

## Контент

```text
JSONC source
→ parse with locations
→ TypeBox/Ajv schema validation
→ semantic validation
→ chronology/reference/provenance validation
→ immutable compiled registry
→ content fingerprint
```

Career content may describe fictional employers/opportunities/hiring/offer/context and historical source refs. It cannot execute code or mutate owner state.

## Persistence and recovery

```text
active draft
→ exact-compatible resume
OR controlled migration with fixture
OR abandon to committed save
OR Safe Mode/read-only export/backup restore
```

Missing or incompatible active career content cannot silently regenerate opportunity, interview, offer or transition.

## Backup

```text
application request
→ block conflicting operations
→ SQLite consistent backup
→ integrity check
→ checksum
→ atomic rename
→ retention cleanup
```

## UI data

UI получает read models, а не mutable domain entities/SQL rows.

View models may aggregate:

- opportunity comparison;
- role-fit explanation;
- workplace trust explanation;
- promotion next step.

UI cannot calculate hire probability, technical outcome, evidence, trust or promotion.

## Ошибки

Typed taxonomy:

- validation;
- compatibility;
- conflict;
- persistence;
- content;
- platform;
- unexpected.

Пользователь получает безопасное сообщение и recovery action; детали остаются в redacted logs.
