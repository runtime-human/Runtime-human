# Professional Situation Content Studio UI

## Статус

Нормативная UI/content-authoring спецификация.

Связанные документы:

- [ADR-020](../adr/ADR-020-authoritative-professional-situation-content-composition-model.md);
- [Professional Situation Content Engine](../game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md);
- [Professional Situation Content](../content/PROFESSIONAL-SITUATION-CONTENT.md);
- [Professional Challenge UI](PROFESSIONAL-CHALLENGE-UI.md);
- [Storybook Workflow](../engineering/STORYBOOK-WORKFLOW.md).

## 1. Цель

Content Studio помогает автору увидеть не внутреннюю schema, а создаваемый игровой выбор:

```text
kernel
→ contexts and pressures
→ materialized variants
→ player-facing preview
→ provider effects/follow-ups
→ coverage and repetition diagnostics
```

Production player UI остаётся Professional Challenge UI. Studio является development-only authoring/QA surface.

## 2. Основные принципы

- сначала player-facing ситуация, затем schema detail;
- semantic difference важнее количества variants;
- invalid combination объясняется, а не просто скрывается;
- coverage показывает gaps, но не требует полного Cartesian product;
- duplicate warnings объясняют общие semantic dimensions;
- exact hidden outcome/chance не показываются как дизайнерский shortcut;
- все previews deterministic и serializable;
- Studio не получает production Tauri/SQLite/network permissions.

## 3. Navigation

Основные экраны:

1. **Corpus Overview**;
2. **Kernel Editor**;
3. **Composition Explorer**;
4. **Variant Preview**;
5. **Coverage & Repetition**;
6. **Diagnostics**;
7. **Fixture Runner**.

Normal authoring flow не требует переходить во все экраны.

## 4. Corpus Overview

Показывает 3–5 главных групп:

- current implementation profile;
- focused content sets;
- valid materialized variants;
- blocking errors;
- highest-risk coverage/repetition issues.

Example:

```text
First-year debugging

4 kernels
3 context frames
2 pressure packages
9 valid variants

Needs attention:
— approach shape repeated in 6 of 9 variants
— no recovery variant for integration context
```

Не показывать один общий «качество контента: 82/100».

## 5. Kernel Editor

### Primary panel

- title;
- archetype;
- professional goal;
- dilemma;
- stage range;
- 2–4 approach intents;
- outcome pattern;
- next-step class.

### Secondary panel

- semantic tags;
- required provider capabilities;
- prohibited contexts;
- coverage labels;
- closest existing kernels.

### Authoring prompts

UI asks:

- «Какое решение здесь принимает программист?»
- «Почему минимум два подхода разумны?»
- «Какая цена у каждого подхода?»
- «Что игрок поймёт из результата?»
- «Чем это отличается от ближайшего kernel?»

Prompts are authoring guidance, not LLM calls.

## 6. Approach comparison

Approaches are shown side by side:

| Intent | Player action | Visible advantage | Visible cost | Availability changes |
|---|---|---|---|---|

Warnings:

- semantic duplicates;
- one approach always dominates fixtures;
- wording reveals outcome;
- syntax/API trivia dependency;
- unavailable approach creates soft lock;
- assistance level missing.

Preview uses Normal player copy, not internal intent IDs by default.

## 7. Composition Explorer

### Matrix

Rows: context frames.  
Columns: pressure packages.  
Cell state:

- valid;
- valid with warning;
- invalid by explicit constraint;
- invalid by provider contract;
- invalid by chronology/access;
- budget-excluded;
- not materialized.

Selecting cell shows:

- kernel;
- context;
- pressure;
- bridge;
- presentation;
- materialized ID;
- compatibility reasons;
- semantic signature delta from base variant.

### Important rule

A green cell means «valid combination», not «high-quality situation». Human review remains required.

## 8. Materialization budget

Display:

```text
Candidate tuples: 36
Valid semantic compositions: 8
Presentation variants: 12
Budget: 12 / 12
```

If exceeded:

- build error visible;
- likely expansion cause highlighted;
- suggested narrowing by context/pressure/presentation;
- no silent truncation.

## 9. Variant Preview

Tabs:

- Normal player view;
- Details view;
- Result variants;
- Provider application;
- Follow-up/recovery;
- semantic snapshot;
- localization/accessibility.

### Normal preview

Uses same component/read model as production Challenge UI:

- title;
- context;
- goal;
- at most two causes;
- 2–4 approaches;
- forecast/trade-off copy.

### Result preview

Author selects fixture outcome class, not arbitrary hidden score:

- clean success;
- success with compromise;
- partial progress;
- failed with learning;
- recovered.

Preview answers:

- what happened;
- why;
- provider change;
- learning/autonomy;
- next step.

## 10. Provider Bridge panel

Shows mapping as typed semantic table:

| Outcome class | Provider proposal | Episode facts | Event hook | Recovery |
|---|---|---|---|---|

Errors:

- effect outside provider ownership;
- production evidence from interview;
- independent claim from takeover;
- missing recovery;
- missing provider revision guard;
- duplicate follow-up hook.

No raw state patch editor.

## 11. Semantic signature

Human-readable view:

```text
Archetype: diagnose
Dilemma: investigate vs patch
Context: personal project
Causes: limited observability, weak documentation
Approaches: investigate / ask help / reduce scope / defer
Consequences: delay, partial diagnosis, assisted recovery
Follow-up: transfer to a new input problem
```

Differences from selected comparison variant are highlighted.

Presentation wording is deliberately excluded from semantic difference view.

## 12. Duplicate clusters

Cluster card:

```text
Possible reskin cluster — 4 variants

Shared:
— same dilemma
— same approaches
— same causes
— same outcome/recovery shape

Different:
— employer name
— technology label
— summary wording
```

Actions:

- merge into one presentation pack;
- justify context-specific difference;
- change pressure/consequence;
- mark intentional tutorial repetition;
- suppress warning with reviewed reason code.

Suppression requires author, reviewer, reason and version.

## 13. Coverage view

### Heatmaps

Recommended views:

- stage × archetype;
- provider × dilemma;
- cause × approach intent;
- technology context × goal class;
- outcome × recovery;
- year/era × provider;
- assistance/autonomy coverage.

Cells show:

- absent;
- covered;
- overrepresented;
- covered only by near-duplicates;
- covered only by unreachable variants;
- explicit exception.

### Pairwise report

Lists missing required interactions, e.g.:

- `integrate + weak-documentation` missing;
- `ask-for-help + transfer-follow-up` missing;
- `project + recovered` underrepresented.

Pairwise score is QA information, not player-facing or automatic quality rating.

## 14. Repetition simulation

Runs deterministic seed corpus and reports:

- exact variant repeat rate;
- kernel repeat rate;
- dilemma repeat rate;
- approach-shape streak;
- cause/provider/archetype concentration;
- presentation-only repeat masking;
- never-selected variants;
- starvation after penalties.

Timeline view explains why Director selected or rejected candidate. Studio reuses Narrative Director trace and does not implement its own pacing score.

## 15. Diagnostics screen

Filters:

- blocking errors;
- professional correctness;
- provider ownership;
- chronology/access;
- duplicate/repetition;
- coverage;
- localization/accessibility;
- stability/fingerprint;
- budget.

Each diagnostic contains:

- code;
- severity;
- affected IDs;
- concise explanation;
- relevant contract;
- remediation suggestion;
- fixture/reproduction link.

## 16. Fixture Runner

Required fixtures:

- January diagnose baseline;
- school/shared-device fallback;
- same kernel under deadline pressure;
- same kernel with assistance;
- invalid provider bridge;
- invalid chronology;
- dominant approach;
- text-only reskin;
- failure without recovery;
- tombstoned component recovery.

Fixture view shows:

- input definitions;
- compiled variant;
- validation trace;
- player preview;
- expected outcome classes;
- fingerprint;
- snapshot diff.

## 17. Storybook

Stories:

- CorpusOverviewHealthy;
- CorpusOverviewWithBlockingErrors;
- KernelEditorBeginnerDiagnose;
- ApproachDuplicateWarning;
- CompositionMatrixMixedValidity;
- VariantPreviewNormal;
- VariantPreviewLongRussian;
- ProviderBridgeInvalidOwnership;
- DuplicateReskinCluster;
- CoverageMissingRecovery;
- RepetitionTimeline;
- FingerprintChanged;
- TombstonedComponentRecovery.

Storybook fixtures are static and use no production persistence/network capabilities.

## 18. Accessibility

- full keyboard navigation;
- matrix has equivalent table/list mode;
- color is never sole validity signal;
- semantic diff has textual description;
- error links move focus to affected field;
- long IDs can wrap/copy without horizontal trap;
- screen-reader names include status and affected components;
- charts have tabular alternatives;
- motion is optional;
- RU long-text fixtures mandatory.

## 19. Performance

Studio may analyze larger corpora, but interaction targets:

- focused set materialization preview under 200 ms after local edit where feasible;
- expensive global coverage/simulation may run explicit analysis command;
- UI remains responsive and shows deterministic progress;
- results cached by content fingerprint;
- stale result visibly marked.

Exact targets are implementation hypotheses until scaffold/profiling.

## 20. Forbidden UI drift

- visual node editor before text/forms prove insufficient;
- one universal content quality score;
- raw arbitrary effect editor;
- hidden chance spreadsheet required for authoring;
- runtime LLM prompt editor;
- automatic generation button producing production content;
- coverage heatmap interpreted as need to fill every cell;
- presentation variants counted as semantic diversity;
- separate Director/pacing implementation;
- production save editing;
- privileged desktop permissions in Storybook.
