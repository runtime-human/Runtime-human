---
title: "PROFESSIONAL-CHALLENGE-IMPLEMENTATION-PLAN"
type: plan
status: draft
canon: true
updated: 2026-07-18
---

# Professional Challenge Engine — Implementation Plan

## Статус

План реализации ADR-016 и `PROFESSIONAL-CHALLENGE-ENGINE.md`.

Активный профиль: **MVP Casual**.

## 1. Scope

Реализовать только январский `diagnose` flow:

```text
invalid-input Technical Situation
→ four approaches
→ persisted deterministic complication
→ ProfessionalChallengeOutcome
→ Project provider application
→ ExperienceEpisode
→ Progression explanation
→ atomic commit
```

Не реализовывать все archetypes, generic DSL, dynamic generation, team/incident/Senior mechanics или full challenge history.

## 2. Packages and ownership

Recommended package boundaries:

```text
packages/contracts
  professional-challenge IDs/contracts/read models

packages/game-core
  professional-challenge resolver
  validation/reason codes
  deterministic fixtures

packages/content
  situation/approach templates and schema validation

packages/ui
  situation/result presentation

apps/desktop/src-tauri
  persistence/transaction boundary only
```

Rules:

- Project provider creates request and applies project effects.
- Challenge resolver returns immutable outcome proposal.
- Progression maps provider `ExperienceEpisode` to learning/evidence.
- Rust/SQLite persists and commits; it does not judge gameplay.

## 3. Contracts

Add only fields required by January flow:

- `TechnicalSituationId`;
- `TechnicalSituationTemplateId`;
- `ProfessionalApproachId`;
- `ProfessionalChallengeOutcomeId`;
- `ProfessionalChallengeArchetype` with `diagnose` supported;
- `ChallengeCauseId`;
- `ProfessionalOutcomeClass`;
- `ChallengeReasonCode`;
- `ProviderEffectProposal`;
- `CapabilityMilestoneId` candidate;
- situation/request/outcome read models.

Do not add fields for teams, incidents, architecture negotiation, dynamic composition or advanced technology versions.

## 4. Content

Create one stable template:

- ID: `challenge.personal-project.invalid-input.v1`;
- archetype: `diagnose`;
- goal/problem text;
- causes: `unfamiliar-problem`, `release-pressure` or canonical equivalents;
- four approaches;
- allowed outcome mappings;
- reason-code mappings;
- provider effects mappings;
- repetition fingerprint;
- RU localization;
- long RU fixture.

Validation must reject direct skill/grade/project mutation.

## 5. Resolver

Implement direct typed resolver, not a generic rule language.

Inputs:

- immutable situation snapshot;
- selected approach;
- relevant professional snapshot;
- current capacity/help availability;
- provider constraints/revision;
- persisted complication;
- rules version/trace.

Outputs:

- outcome class;
- completion/quality/autonomy bands;
- compromise/complication;
- stable reason codes;
- provider effects proposal;
- episode facts;
- capability candidate;
- trace hash.

## 6. MonthRun integration

Before showing decision persist:

- situation snapshot/fingerprint;
- option IDs/content versions;
- provider revision;
- complication realization;
- RNG/rules fingerprints.

After answer persist provisional:

- selected approach;
- challenge outcome;
- provider application draft;
- episode facts;
- explanation payload.

Atomic commit includes:

- project state/result;
- professional progression result;
- history/report records;
- terminal MonthRun state.

## 7. UI

Implement Storybook-first:

- situation card;
- four approach cards;
- selected/unavailable states;
- suspended MonthRun state;
- independent clean outcome;
- assisted outcome;
- compromise outcome;
- partial/failure outcome;
- recovery/next step;
- long RU/keyboard/200%/contrast/reduced motion.

Normal mode contains no exact probabilities, evidence points or raw reason codes.

## 8. Tests

### Unit

- request/option validation;
- stable resolver outputs;
- reason-code mapping;
- provider effect validation;
- episode mapping;
- capability candidate does not directly mutate progression.

### Property

- same snapshot/approach gives same result;
- duplicate answer idempotent;
- unavailable option rejected;
- partial/failure not full delivery;
- assisted not independent;
- every non-ending failure has recovery;
- content cannot mutate authoritative state.

### Integration

- Project request → Challenge outcome → Project apply → Episode → Progression;
- close/restart before answer;
- close/restart after provisional outcome;
- provider revision conflict;
- atomic commit rollback/retry;
- no duplicate history/evidence.

### UI/usability

- situation restated correctly;
- approaches distinguished;
- choice within 10–20 seconds;
- trade-off direction predicted;
- two causal factors understood;
- next step found without Details.

## 9. Ordered implementation tasks

1. Add challenge IDs/enums/contracts.
2. Add content schema and one template.
3. Add deterministic complication fixture.
4. Implement direct resolver and reason codes.
5. Implement Project provider adapter/application.
6. Map applied result to `ExperienceEpisode`.
7. Integrate Progression explanation/capability candidate.
8. Extend suspended MonthRun draft.
9. Extend SQLite save/transaction mapping only for implemented fields.
10. Build Storybook challenge/result stories.
11. Add unit/property/integration tests.
12. Run usability fixtures and record product verdict.
13. Expand content only after slice gates pass.

## 10. Definition of Done

- contracts preserve Provider/Challenge/Project/Progression ownership;
- one January situation works end-to-end;
- four approaches have distinct trade-offs;
- visible decision cannot reroll;
- duplicate answer/resume is idempotent;
- all outcome variants have causal explanation/recovery;
- capability claim is owned by Progression;
- normal UI passes accessibility/long RU;
- no global best approach in declared fixtures;
- playtest majority wants to continue to February;
- no Extended fields or generic DSL implemented speculatively.
