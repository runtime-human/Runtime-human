---
title: "Professional Situation Content — Balance, Coverage & Variety"
type: simulation
status: draft
canon: true
depends_on: [ADR-020]
updated: 2026-07-18
---

# Professional Situation Content — Balance, Coverage & Variety

## Статус

Нормативная balance/verification спецификация.

Основание:

- [ADR-020](../adr/ADR-020-authoritative-professional-situation-content-composition-model.md);
- [Professional Situation Content Engine](../game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md);
- [Professional Challenge Balance](PROFESSIONAL-CHALLENGE-BALANCE.md);
- [Narrative Director](../events/NARRATIVE-DIRECTOR.md).

## 1. Цель

Проверять, что расширение corpus увеличивает число содержательно разных профессиональных решений, а не только количество текстов.

Основные риски:

- presentation reskin;
- одинаковый choice shape в разных темах;
- один универсально сильный approach;
- cause/provider/archetype monoculture;
- unbounded materialization;
- unreachable content;
- false coverage;
- repetition penalties causing starvation;
- excessive authoring complexity;
- provider/evidence semantic errors.

## 2. Нет единого content score

Не вводится authoritative `ContentQuality = 84`.

Отдельно измеряются:

- validity;
- professional coherence;
- decision distinctness;
- coverage;
- exposure;
- repetition;
- dominance;
- comprehension;
- consequence linkage;
- authoring cost;
- runtime/persistence stability.

## 3. Corpus layers

Metrics distinguish:

1. authored components;
2. candidate tuples;
3. valid semantic compositions;
4. presentation variants;
5. eligible runtime variants;
6. selected/exposed variants;
7. completed situations;
8. meaningful follow-ups.

Reporting only final count hides explosion and dead content.

## 4. Core metrics

### Materialization

- authored kernel count;
- context/pressure/bridge/presentation count;
- candidate tuple count;
- valid semantic composition count;
- materialized variant count;
- presentation variants per semantic composition;
- rejection reasons by rule;
- materialization expansion ratio.

### Semantic diversity

- unique dilemma count;
- unique approach-shape count;
- unique cause-set count;
- unique consequence-shape count;
- unique follow-up class count;
- semantic signature count;
- presentation-only group size;
- near-duplicate cluster count/size.

### Coverage

- required tuple coverage;
- pairwise coverage across declared dimensions;
- stage × archetype;
- provider × dilemma;
- cause × approach intent;
- goal × outcome/recovery;
- technology context × professional goal;
- assistance/autonomy coverage;
- era coverage where required.

### Runtime exposure

- exact variant exposure;
- kernel/dilemma exposure;
- never-eligible count;
- never-selected count;
- repeat interval;
- longest approach-shape streak;
- longest cause/provider/archetype streak;
- starvation after anti-repeat penalties;
- mandatory follow-up delivery.

### Player comprehension

- time to understand situation;
- choice time;
- ability to state dilemma;
- ability to explain chosen advantage/cost;
- ability to distinguish two similar variants;
- result causality comprehension;
- next-step comprehension;
- advanced-details dependency rate.

### Authoring efficiency

- authored kernels per accepted semantic variant;
- review time per variant;
- rejected tuple rate;
- shared fix fan-out;
- duplicate warning resolution time;
- localization words per semantic composition;
- fixture maintenance cost.

## 5. Variety is not uniformity

Corpus does not need equal representation of every archetype/cause.

Required principle:

- distribution follows professional stage and active systems;
- repeated fundamentals are allowed;
- repetition should escalate, transfer or change trade-off;
- rare high-stakes/systemic situations remain rare;
- coverage targets are profile-specific.

Example:

`diagnose` may be common in first year, but should vary through:

- reproduction versus patch;
- input/data versus integration;
- familiar versus unfamiliar context;
- independent versus assisted;
- limited observability versus unclear requirement;
- fix-only versus test/document follow-up.

## 6. Reskin detection

### Exact semantic duplicate

Two variants share:

- kernel/dilemma;
- approach intents;
- cause set;
- provider/context class;
- consequence classes;
- follow-up classes.

Different wording/name/technology label without changed constraints does not make new gameplay.

Policy:

- reject by default;
- allow as presentation pack variant;
- intentional tutorial repetition requires explicit reviewed exemption.

### Near duplicate

Weighted overlap:

- dilemma: high weight;
- approach shape: high;
- consequence/recovery: high;
- cause set: medium;
- provider/context: medium;
- technology family: low unless compatibility changes trade-off;
- participant identity: low unless relationship/authority matters.

Near-duplicate warning requires human review, not automatic rejection.

## 7. Approach dominance

For each approach intent and declared fixture set measure:

- selection utility by outcome/recovery dimensions;
- access cost;
- capacity/time cost;
- autonomy/assistance consequence;
- provider consequence;
- follow-up quality;
- frequency of best-or-tied outcome.

Reject or redesign when one approach:

- is available in almost all variants;
- provides equal/better completion, quality and recovery;
- has no meaningful additional cost;
- is selected by optimal policies in nearly all fixtures;
- becomes a hidden default button.

No single numeric utility is authoritative. Dominance is multi-objective/fixture-based.

## 8. Approach-shape fatigue

Two situations may have different topics but identical shape:

```text
investigate / ask help / reduce scope / defer
```

This shape is valid for January but cannot dominate the entire game.

Metrics:

- shape frequency;
- consecutive shape streak;
- stage/provider concentration;
- changed availability/trade-offs;
- player perceived sameness.

First-year hypothesis:

- no one exact 4-option shape in more than half of meaningful situations without explicit review;
- consecutive identical shapes target maximum 2;
- repeated shape must alter at least pressure, availability or consequence meaning.

These are playtest hypotheses, not permanent constants.

## 9. Cause balance

Risks:

- deadline pressure appears everywhere because it is easy to write;
- unfamiliar technology becomes generic difficulty label;
- weak documentation does not change choice;
- high consequence used for artificial drama.

Validation:

- cause has semantic effect;
- cause is stage/provider plausible;
- at most two visible causes ordinary situation;
- same cause set has cooldown/repetition metadata;
- high-consequence contexts have appropriate lifecycle/recovery.

## 10. Coverage without Cartesian explosion

Coverage dimensions can produce huge cross-product. System uses:

- explicit mandatory tuples for critical flows;
- pairwise coverage heuristic for selected dimensions;
- targeted higher-order tuples for known risky interactions;
- exceptions for invalid/unnecessary combinations;
- profile-specific budgets.

Example required tuples:

```text
beginner + project + diagnose + limited-observability + investigate-first
beginner + learning + build + ask-for-help + assisted-outcome
intern + career + diagnose + work-sample + no-production-evidence
junior + workplace + scope-deadline + disclose-risk + trust-follow-up
```

Coverage report must distinguish:

- absent;
- invalid by design;
- deferred system;
- covered by valid variant;
- covered only by near duplicate;
- covered but never eligible/selected.

## 11. Materialization budget

Build fails on exceeding declared budget.

Metrics:

- candidates before constraints;
- valid semantic compositions;
- presentation expansion;
- total registry contribution;
- compile time/memory;
- diagnostics volume.

Recommended first-year budget hypothesis:

- 6–10 kernels total;
- 12–24 semantic materialized variants;
- maximum two presentation variants per semantic composition;
- focused composition set maximum 6–12 semantic variants.

Expansion beyond requires:

- repetition/coverage evidence;
- authoring/review capacity;
- playtest need;
- explicit roadmap update.

## 12. Provider balance

Content count must not hide provider starvation.

Track:

- Learning/Project/Career/OSS/Company eligibility;
- provider meaningful-decision share;
- provider-specific unique dilemmas;
- bridge/recovery completeness;
- professional outcome months.

First year primarily Learning/Project. Career appears only when stage permits. OSS/Company content does not count as coverage before systems exist.

## 13. Professional-stage balance

### Beginner

- bounded goals;
- visible causes;
- assistance/recovery routes;
- no high-level architecture jargon;
- no production catastrophe.

### Intern/Junior

- unfamiliar code/context;
- review and bounded ownership;
- quality/scope trade-offs;
- communication and risk disclosure;
- production-like contexts only where provider supports them.

### Middle/Senior

Deferred until stage systems exist:

- systemic trade-offs;
- architecture;
- incident/operations;
- mentoring/delegation;
- organizational coordination.

High-stage kernels cannot inflate first-year count.

## 14. Consequence and follow-up balance

Metrics:

- clean success rate;
- compromise rate;
- partial/failure/recovered rate;
- recovery availability;
- delayed hook rate;
- prior-decision linkage;
- follow-up delivery latency;
- repair-compromise occurrence;
- repeated failure soft-lock rate.

Targets align with Director delayed-consequence policy but do not duplicate pacing.

A situation library fails if most choices end as isolated one-off cards with no provider or future consequence.

## 15. Assistance/autonomy balance

Track:

- assistance option availability;
- assistance selection;
- assisted success;
- independent transfer follow-up;
- takeover mislabeled cases;
- low-access/low-skill recovery;
- mentor dominance.

Assistance should:

- prevent hard locks;
- improve learning/recovery;
- sometimes reduce autonomy evidence;
- lead toward later independent application.

It must not be universally optimal or universally punished.

## 16. Technology/context balance

Technology labels count as meaningful variation only when context changes:

- available tooling;
- compatibility;
- support;
- documentation;
- deployment/operation;
- market/provider constraints;
- migration risk.

Track:

- label-only variations;
- latest-tech dominance;
- legacy dead ends;
- context-specific approach changes;
- technology transfer situations;
- historically invalid contexts.

## 17. Repetition policy integration

Composition compiler emits repetition metadata. Narrative Director owns runtime penalty and pacing.

Tests must ensure:

- exact repeat reduced;
- semantic repeats reduced;
- presentation variants do not evade cooldown;
- penalties do not starve mandatory/only valid professional content;
- recovery/follow-up chains outrank generic novelty where required;
- stable tie-break/determinism preserved.

## 18. Deterministic corpus simulation

Run segmented seed corpus:

- low-access beginner;
- home-access beginner;
- mentor-rich beginner;
- independent-project path;
- career-first path after readiness;
- interruption/recovery;
- legacy/modern context when implemented.

Each segment reports:

- eligibility distribution;
- selected situations;
- semantic repeat/streaks;
- coverage exposure;
- soft locks;
- quiet/professional months;
- follow-up delivery;
- never-selected content.

Same content/rules/seed/state must produce same trace.

## 19. Golden fixtures

Minimum:

1. January baseline diagnose.
2. Same kernel under deadline pressure.
3. Same kernel with weak documentation.
4. School fallback with help available.
5. Presentation-only reskin cluster.
6. Invalid pressure/context.
7. Dominant approach.
8. Failure without recovery.
9. Hiring work sample trying to mint production evidence.
10. Provider bridge ownership violation.
11. Materialization budget overflow.
12. Input order stability.
13. Tombstoned component compatibility.
14. Anti-repeat starvation with only mandatory follow-up.
15. Coverage target missing required tuple.

## 20. Playtest questions

Ask player:

- «В чём была проблема?»
- «Почему выбранный подход имел смысл?»
- «Какой был риск или цена?»
- «Чем эта ситуация отличалась от похожей прошлой?»
- «Что изменилось после результата?»
- «Какой следующий шаг появился?»

Ask author/reviewer:

- «Можно ли исправить общую проблему один раз?»
- «Почему эта composition существует?»
- «Какая semantic coverage добавилась?»
- «Есть ли text-only reskin?»
- «Можно ли понять invalid diagnostics?»
- «Не превышает ли schema стоимость создаваемой вариативности?»

## 21. Gates

Reject expansion when:

- semantic variant count grows faster than unique dilemmas/approach shapes;
- >25% new variants are presentation-only reskins outside explicit need;
- dominant approach persists after declared fixture review;
- first-year player reports sameness despite higher variant count;
- materialization creates many never-eligible variants;
- coverage is inflated by deferred providers/stages;
- advanced UI is needed to understand ordinary choice;
- authoring/review cost exceeds demonstrated repetition problem;
- runtime generation is introduced to avoid authoring discipline.

Thresholds are starting review triggers, not permanent balance constants.

## 22. Definition of Done

Balance layer is ready when:

- corpus layers are separately measured;
- semantic signatures stable;
- duplicate clusters reviewed;
- materialization inside budget;
- required coverage targets pass;
- dominant-approach fixtures pass;
- repetition simulation has no starvation;
- provider/recovery mappings complete;
- player comprehension is tested;
- authoring cost tracked;
- reports are deterministic and snapshot-testable.
