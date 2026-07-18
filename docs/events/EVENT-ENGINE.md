---
title: "Event Engine"
type: events
status: draft
canon: true
depends_on: [ADR-009, ADR-020]
updated: 2026-07-18
---

# Event Engine

Нормативные решения:

- [ADR-009 — Narrative Director](../adr/ADR-009-narrative-director.md)
- [ADR-020 — Professional Situation Content Composition](../adr/ADR-020-authoritative-professional-situation-content-composition-model.md)

Связанные спецификации:

- [Professional Challenge Engine](../game-design/PROFESSIONAL-CHALLENGE-ENGINE.md)
- [Professional Situation Content Engine](../game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md)
- [Narrative Director](NARRATIVE-DIRECTOR.md)

## Ответственность

Event Engine определяет, какие события допустимы, как выбираются participants, как создаются PendingDecision и chains, какие allowlisted effects применяются и как сохраняются delayed consequences.

Event Engine не компилирует professional-situation components, не создаёт approaches, не рассчитывает Challenge outcome и не выполняет Narrative Director pacing.

## Типы событий

- random;
- scheduled;
- chained;
- reactive;
- repeatable;
- unique;
- rare;
- crisis;
- background/log-only;
- world/era;
- professional;
- personal;
- hidden-cause.

## EventDefinition

Содержит:

- stable ID и version;
- category/tags/product layer;
- availability window;
- requirements/incompatibilities;
- weight/cooldown/blocking policy;
- participants selector;
- choices;
- immediate/delayed effects;
- chain transitions;
- journal template;
- historical provenance;
- optional reference to a compiled professional-situation variant or bounded lookup selector.

Professional reference points only to compiled registry metadata. It does not embed kernel/context/pressure tuples and does not define provider outcome.

## Selection

1. Собрать definitions активной эпохи.
2. Проверить requirements.
3. Исключить cooldown/unique/incompatible.
4. Разрешить participants.
5. Для professional reference получить eligible compiled-situation candidates from provider/registry.
6. Исключить event, если обязательная situation не materializable.
7. Рассчитать integer weights.
8. Передать candidates Narrative Director.
9. Выполнить deterministic selection.
10. Сохранить selected event, participants и situation snapshot до player choice.

Reload не запускает повторный professional-situation selection.

## Professional event flow

```text
EventDefinition
→ requirements/participants
→ provider lookup of compiled situations
→ Narrative Director selection
→ persisted event + situation snapshot
→ Professional Challenge resolution
→ provider application
→ event/provider follow-up hooks
```

Event Engine owns chain stage and delayed event hooks. Provider owns domain application. Challenge Engine owns technical outcome.

## Effects

Effects являются declarative operations из allowlist и применяются через versioned handlers. Professional consequence bridge возвращает typed provider proposals; Event applies only event-owned effects/hooks.

Event cannot grant mastery/evidence/grade or calculate Project/Career/Learning truth.

## Blocking policy

Blocking event creates PendingDecision and stops current MonthRun step. Log-only event records without blocking.

Ordinary event-wrapped professional situation should remain one coherent blocking decision, not two unrelated modals.

## Semantic repetition metadata

Professional event candidate exposes Director:

- exact variant key;
- kernel/dilemma key;
- approach-shape key;
- cause/consequence/provider/archetype keys;
- presentation-only group key;
- stakes/intensity;
- follow-up/arc metadata.

Event Engine does not score novelty itself.

## Persistence and trace

Persist before choice:

- event ID/version;
- participants and chain stage;
- compiled variant ID/version;
- semantic/presentation/provider snapshots;
- approaches and realized complication;
- Director trace reference;
- content/rules fingerprints.

After answer one idempotency key guards Challenge outcome, provider application, event hook and ExperienceEpisode.

Trace records definition, eligibility, lookup, weight/Director trace, participants, choice, effects and hashes.

## Validation

Reject when:

- reference targets mutable authoring components rather than compiled lookup;
- provider binding missing;
- event duplicates provider consequence;
- chain can reroll visible situation;
- presentation-only variant evades semantic repetition;
- arbitrary script/network/runtime generation required;
- historical fact lacks sourceRefs.

## Запреты

- arbitrary JS;
- SQLite/UI access from content;
- hidden `Math.random`;
- missing persistent NPC;
- effects outside registry;
- runtime composition or LLM generation;
- duplicate Director/Challenge/provider logic.
