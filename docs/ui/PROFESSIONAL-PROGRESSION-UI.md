# Professional Progression UI

Нормативные источники:

- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [UI Architecture](UI-ARCHITECTURE.md).

## Цель

Показывать развитие программиста понятно обычному игроку и правдоподобно технической аудитории, не превращая игру в performance-review spreadsheet.

UI не пересчитывает mastery, evidence или grade. Он получает typed read models.

## Два уровня раскрытия

### Normal mode

Показывает:

- capability text;
- устойчивость/временность результата;
- следующий полезный тип задачи/evidence;
- human-readable challenge;
- причины роста/стагнации;
- current professional focus;
- critical market-readiness gap.

### Advanced mode

Показывает:

- mastery/fluency/familiarity;
- evidence claims и source/context;
- capability bands;
- grade gate coverage;
- technology transfer/lifecycle;
- demonstrated vs current market readiness;
- detailed reason codes.

Exact hidden formula weights не являются обязательным UI и не должны стимулировать spreadsheet min-max.

## Read models

```ts
type ProfessionalSummaryReadModel = Readonly<{
  awardedGrade: ProfessionalGrade;
  demonstratedCapability: LocalizationKey;
  currentMarketState: MarketReadinessLabel;
  professionalFocus: ProfessionalFocusReadModel;
  strongestSkills: readonly SkillCapabilityReadModel[];
  nextUsefulEvidence: readonly EvidenceGapReadModel[];
  warnings: readonly ProfessionalWarningReadModel[];
}>;

type SkillCapabilityReadModel = Readonly<{
  skillId: SkillId;
  label: LocalizationKey;
  capabilityBand: CapabilityBand;
  capabilityText: LocalizationKey;
  masteryTrend: ProgressTrend;
  fluencyState: FluencyLabel;
  lastPracticed?: GameDate;
  evidenceSummary: EvidenceSummaryReadModel;
}>;

type GradeReadinessReadModel = Readonly<{
  awardedGrade: ProfessionalGrade;
  demonstrated: ReadinessProfileReadModel;
  currentMarket: ReadinessProfileReadModel;
  coreGates: readonly GradeGateReadModel[];
  profileGates: readonly GradeGateReadModel[];
  contextDiversity: ContextDiversityReadModel;
  reasonsNotReady: readonly ReadinessReasonReadModel[];
}>;

type EvidenceTimelineReadModel = Readonly<{
  entries: readonly EvidenceTimelineEntryReadModel[];
  groupedRoutinePractice: readonly PracticeAggregateReadModel[];
  filters: EvidenceTimelineFilters;
}>;
```

## Awarded grade vs readiness

UI обязан различать:

- **Ваш подтверждённый грейд** — achieved milestone;
- **Готовность к следующему грейду** — demonstrated gaps;
- **Актуальность для текущего рынка** — recency/technology/fluency.

Пример:

```text
Подтверждённый грейд: Senior
Текущая готовность к рынку: требуется восстановить практику C#/.NET
Профессиональное мастерство не потеряно; снизилась скорость и актуальность инструментов.
```

Запрещено показывать rusty Senior как автоматическое понижение до Middle.

## Evidence card

Карточка отвечает:

- что произошло;
- какую capability подтвердило;
- challenge band;
- самостоятельно или с помощью;
- полный/частичный/failure outcome;
- насколько evidence сильное/устойчивое;
- какой следующий шаг полезен.

Пример:

```text
Debugging вырос

Вы самостоятельно нашли причину ошибки в программе средней сложности
после проверки входных данных и двух неверных гипотез.

Подтверждено:
• Debugging — Independent
• Problem Solving — Routine

Не подтверждено:
• Delivery — исправление осталось частичным

Следующий шаг:
найти ошибку, затрагивающую несколько компонентов.
```

## Progression delta

Monthly report группирует изменения:

1. устойчивое mastery;
2. текущая fluency/familiarity;
3. evidence claims;
4. readiness/gate changes;
5. новые options/tasks/technologies.

Мелкая routine practice не создаёт десятки карточек. Она показывается одной строкой/aggregate.

## Challenge preview

Игроку показываются human-readable labels:

- под руководством;
- знакомая задача;
- самостоятельная задача;
- сложная неоднозначная задача;
- системная ответственность.

Advanced detail может раскрыть facets: ambiguity, integration, quality criticality, operational risk.

Forecast не гарантирует outcome и не показывает точную probability, если это создаёт save-scumming/min-max.

## Technology UI

Technology card показывает:

- Tier A/B status только в advanced/debug, если tier не нужен игроку;
- family/category;
- lifecycle stage;
- conceptual/operational familiarity;
- version recency;
- market/legacy value;
- transfer explanations;
- доступные learning/project contexts.

Tier C не получает progress bar и отображается как requirement/tag.

## Specialization UI

Игрок выбирает professional focus, но specialization profile описывается как наблюдаемый путь:

```text
Фокус: Desktop Development
Сформировавшийся профиль: Desktop / Backend
Дополнительная сильная область: Tooling
```

Specialization не показывается как необратимый class selection.

## Warnings

- skill fluency rust;
- technology version outdated;
- market readiness gap;
- evidence concentrated in one context;
- repeated easy tasks give little new evidence;
- excessive parallel commitments;
- missing feedback/mentor;
- grade gate requires different task type.

Warning содержит cause и recovery action. Он не передаётся только цветом.

## Storybook groups

- Professional Summary: Beginner/Junior/Senior/Rusty Senior;
- Skill Capability: no evidence/assisted/independent/strong but rusty;
- Technology Familiarity: new/mainstream/legacy/outdated version;
- Evidence Card: full/partial/failure/mentored/repeated;
- Grade Readiness: one missing core gate/context concentration/profile choice;
- Monthly Delta: quiet month/large gain/stagnation/reentry;
- Evidence Timeline: long history/missing content/tombstone;
- Accessibility: long RU, 200%, high contrast, keyboard, Narrator.

## Usability tests

Новичок за 10 минут должен:

- отличить skill от technology;
- понять, почему assisted task учит, но слабее подтверждает самостоятельность;
- понять, почему grade не равен position;
- найти следующий полезный шаг;
- объяснить difference mastery/temporary fluency простыми словами.

Эксперт должен:

- увидеть provider outcome/evidence causality;
- не воспринимать систему как XP bar;
- понять current market readiness;
- найти advanced evidence/gate details;
- доверять partial/failure semantics.

## Performance

- evidence timeline virtualized;
- readiness projection приходит готовой;
- UI не пересчитывает полный ledger;
- pagination/grouping stable;
- missing-content fallback не требует network;
- Storybook fixtures bounded, отдельный large-history performance fixture.

## Definition of Done

Progression UI change готово, когда:

- использует typed read models;
- не смешивает awarded grade/readiness/title;
- normal/advanced modes согласованы;
- claims/source/cause traceable;
- routine practice агрегирована;
- partial/failure не отображаются как full success;
- accessibility/long RU/keyboard stories проходят;
- нет raw formula/persistence/core import.
