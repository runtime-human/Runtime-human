---
title: "Professional Situation Pacing Integration"
type: events
status: draft
canon: true
depends_on: [ADR-009, ADR-020]
updated: 2026-07-18
---

# Professional Situation Pacing Integration

## Статус

Нормативное дополнение к:

- [ADR-009 — Narrative Director](../adr/ADR-009-narrative-director.md);
- [ADR-020 — Professional Situation Content Composition](../adr/ADR-020-authoritative-professional-situation-content-composition-model.md);
- [Narrative Director](NARRATIVE-DIRECTOR.md);
- [Event Engine](EVENT-ENGINE.md);
- [Professional Situation Content Engine](../game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md).

## 1. Цель

Определить, как Narrative Director использует metadata compiled professional situations для variety/pacing без владения composition, eligibility, outcome или provider effects.

## 2. Boundary

```text
compiled immutable situation registry
→ provider/Event eligibility
→ eligible event/provider candidates
→ Narrative Director pacing/selection
→ persisted selected candidate
→ Challenge resolution
```

Director получает только готового candidate и metadata. Он не:

- выбирает authoring components;
- изменяет kernel/context/pressure/approaches;
- создаёт новый presentation;
- исправляет invalid provider mapping;
- рассчитывает Challenge outcome;
- меняет Progression;
- вызывает runtime LLM/generator.

## 3. Candidate metadata

```ts
type ProfessionalSituationNarrativeMetadata = Readonly<{
  compiledVariantId: CompiledSituationVariantId;
  productLayer: NarrativeProductLayer;
  providerKind: ExperienceProviderKind;
  archetype: ProfessionalChallengeArchetype;
  professionalStage: ProfessionalStageBand;
  stakes: CasualStakeBand;
  intensity: NarrativeIntensityBand;
  semanticSignature: ProfessionalSituationSemanticSignature;
  repetitionProfile: ProfessionalSituationRepetitionProfile;
  followUpProfile: ProfessionalSituationFollowUpProfile;
  participantRoleIds: readonly NarrativeParticipantRoleId[];
  requiredArcId?: NarrativeArcId;
  requiredHookId?: NarrativeHookId;
  earliestAt?: GameDate;
  latestAt?: GameDate;
}>;
```

Director does not need full authoring definitions or provider effect mappings.

## 4. Repetition dimensions

Existing recency/category/participant penalties are extended with semantic dimensions supplied by compiled content:

- exact variant;
- kernel;
- dilemma;
- approach shape;
- cause set;
- consequence shape;
- provider/archetype combination;
- participant-role shape;
- presentation-only group.

### Rules

- presentation-only variant never counts as fresh semantic content;
- same kernel under meaningfully changed pressure/context may receive reduced, not necessarily full, repetition penalty;
- required follow-up/arc stage is not suppressed solely for similarity;
- tutorial repetition may have explicit reviewed exemption;
- penalties cannot create permanent professional starvation.

## 5. Scoring integration

Director keeps existing integer/fixed-point scoring.

Additional modifiers may include:

```text
- exact variant recency penalty
- kernel/dilemma recency penalty
- approach-shape streak penalty
- cause/provider concentration penalty
+ meaningful context/pressure transfer bonus
+ required professional follow-up priority
+ missing coverage/exposure diagnostic bonus (development rules only)
```

Production pacing must not use coverage target as a reason to show an ineligible or narratively incoherent situation. Coverage/exposure correction can only rank already eligible candidates and remains versioned/traceable.

## 6. Stable selection

Candidate ordering:

```text
existing final Director score
→ declared event/provider priority
→ compiled variant stable ID
```

If RNG is required, use existing Narrative Director RNG scope. Situation compiler has no runtime RNG.

## 7. Event-wrapped versus provider-direct

### Event-wrapped

Event candidate contains persistent participants, arc/hook and compiled-situation lookup result. Director selects the event candidate as one unit.

### Provider-direct

Project/Learning/Career provider may surface a pending professional decision as mandatory/eligible candidate. Director may pace optional candidates, but cannot replace a provider-mandatory situation with unrelated flavour content.

## 8. Follow-up priority

Compiled situation may propose follow-up classes. Provider/Event converts proposal into authoritative hook where valid.

Director uses:

- unresolved hook;
- earliest/latest window;
- relationship/provider continuity;
- prior decision link;
- stakes/recovery state.

It does not infer follow-up from free text.

## 9. Quiet months

Professional situation registry presence does not force a decision every month.

Quiet month remains valid when:

- no meaningful eligible professional decision exists;
- recent intensity requires recovery;
- routine project/learning/work progress aggregates;
- active follow-up window has not opened;
- showing another similar kernel would create fatigue.

Anti-repeat must not create indefinite quiet streak when a required professional milestone is eligible.

## 10. Trace

For selected and important rejected professional candidates, Director trace includes:

- compiled variant ID;
- semantic repetition keys;
- recent counts/windows;
- applied semantic penalties/bonuses;
- required hook/arc priority;
- product-layer budget state;
- final score/tie-break;
- RNG scope/result where used;
- reason code.

Production UI does not show exact scores.

## 11. Simulation metrics

Add to existing Narrative Director simulation:

- exact variant repeat rate;
- kernel/dilemma repeat rate;
- approach-shape streak;
- presentation-only freshness violations;
- cause/provider/archetype concentration;
- semantic repeat interval;
- mandatory follow-up delivery;
- professional starvation after penalties;
- never-selected compiled variants;
- coverage exposure by stage/provider/archetype.

Coverage exposure is diagnostic, not a production selection mandate.

## 12. Required fixtures

1. Two presentation variants of same semantic composition share cooldown.
2. Same kernel with changed pressure receives partial novelty only.
3. Mandatory recovery follow-up selected despite kernel recency.
4. Optional repeated situation loses to distinct eligible situation.
5. Anti-repeat with one eligible mandatory candidate does not starve.
6. Input insertion order does not change tie-break.
7. Reload does not re-run Director selection.
8. Ineligible coverage-gap candidate remains ineligible.
9. Quiet month remains possible with only high-penalty optional candidates.
10. Event participant continuity outranks cosmetic novelty.

## 13. Forbidden drift

- Director composing professional situations;
- Director changing approach availability/effects;
- coverage target forcing invalid content;
- presentation wording treated as semantic novelty;
- duplicate professional pacing implementation in compiler;
- embeddings/LLM deciding production novelty;
- floating-point or unstable ordering;
- reroll after candidate becomes visible;
- novelty suppressing mandatory consequence permanently.
