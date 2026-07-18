---
title: "Professional Progression UI"
type: ui
status: draft
canon: true
depends_on: [ADR-013, ADR-015]
updated: 2026-07-18
---

# Professional Progression UI

## Статус

Нормативная UI-спецификация.

Источники:

- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md).

## 1. Цель

Игрок должен понимать профессиональный рост без знания терминов evidence, mastery, fluency, claims и gates.

Основной экран отвечает:

- что персонаж теперь умеет;
- что изменилось за месяц;
- что пока получается только с помощью;
- какой следующий шаг полезен;
- насколько близок следующий грейд.

## 2. Уровни раскрытия

### Normal — обязателен

Показывает:

- awarded grade;
- capability phrase;
- максимум 3–5 relevant skills;
- active technology familiarity;
- readiness status;
- one next step;
- monthly explanation.

### Details — после MVP при необходимости

Показывает:

- важные source/outcome entries;
- причины assisted/partial/failure result;
- несколько readiness gaps;
- temporary fluency/market issue;
- historical milestone.

### Advanced/Diagnostics — deferred

Может показывать:

- mastery/fluency/familiarity points;
- evidence claims;
- gate profile;
- context diversity;
- reason codes/trace.

Advanced не является обязательной игровой поверхностью.

## 3. Casual read model

```ts
type CasualProfessionalSummary = Readonly<{
  awardedGrade: ProfessionalGrade;
  capabilityText: LocalizationKey;
  relevantSkills: readonly CasualSkillSummary[];
  activeTechnology?: CasualTechnologySummary;
  readinessStatus: CasualReadinessStatus;
  nextStep: LocalizationKey;
  monthlyExplanation?: LocalizationKey;
  warning?: CasualProfessionalWarning;
}>;

type CasualSkillSummary = Readonly<{
  skillId: SkillId;
  label: LocalizationKey;
  state: CasualCapabilityState;
  change?: ProgressTrend;
  explanation?: LocalizationKey;
}>;
```

`relevantSkills` normally has 3 items and never exceeds 5 on one screen.

## 4. Capability language

Examples:

```text
Учится с подсказками
Справляется со знакомыми задачами
Самостоятельно решает простые проблемы
Готов к более сложным задачам
Уверенно владеет этой областью
```

Не показывать normal mode как:

```text
Debugging mastery 18420
Autonomy claim 0.67
Gate coverage 3/7
```

## 5. Readiness

Normal areas:

- техническая база;
- самостоятельность;
- сложность задач;
- надёжность результата.

Status:

- недостаточно опыта;
- развивается;
- почти готов;
- готов.

Пример:

```text
Готовность к Junior: развивается

Вы уже самостоятельно завершаете знакомые задачи.
Для следующего шага нужен опыт более сложной ошибки и стабильный результат без подсказок.
```

Exact formula hidden.

## 6. Monthly professional result

Один meaningful outcome создаёт одну primary explanation:

```text
Отладка улучшилась

Вы с небольшой помощью нашли причину ошибки.
Теперь вы лучше понимаете, как проверять ввод, но пока не всегда решаете такие проблемы самостоятельно.

Следующий шаг: похожая задача без подсказки.
```

Routine practice grouped:

> Продолжали практиковаться; уверенность постепенно растёт.

Не создавать отдельные evidence cards за каждое действие.

## 7. Assisted, partial and failure

### Assisted

> Вы разобрались в задаче благодаря подсказке. Знание выросло, но самостоятельность пока не подтверждена.

### Partial

> Вы нашли причину проблемы, но не успели завершить исправление.

### Failure with learning

> Решение не получилось, но вы исключили несколько неверных подходов и знаете, что проверить дальше.

UI не выдаёт partial/failure как full delivery.

## 8. Technology

MVP card:

- name;
- familiarity: новая / знакомая / уверенно использует;
- current relevance;
- next learning context.

Tier, transfer graph, version recency and lifecycle details are hidden/deferred unless they affect current choice.

## 9. Awarded grade vs current state

UI distinguishes:

- подтверждённый грейд;
- готовность к следующему;
- временная потеря практики.

Пример позднего режима:

```text
Подтверждённый грейд: Senior
Практика: требуется освежить современные инструменты

Профессиональное мастерство не потеряно.
```

Automatic grade downgrade forbidden.

## 10. Warnings

MVP warnings only when actionable:

- repeated easy tasks give little new growth;
- too many active commitments;
- technology access/equipment missing;
- long break reduces fluency;
- next grade needs another task type.

One primary warning at a time.

## 11. Storybook baseline

- Beginner summary;
- assisted learning;
- independent success;
- partial result;
- failure with recovery;
- readiness developing/almost-ready;
- quiet month;
- long Russian text;
- keyboard/200%/high contrast/Narrator.

Deferred:

- full evidence timeline;
- advanced gate matrix;
- context-diversity dashboard;
- long Senior history.

## 12. Usability tests

Player without programming experience should:

- understand what changed;
- distinguish skill from technology by context, not definition quiz;
- understand assisted vs independent;
- find next step;
- explain readiness status;
- avoid opening Details for ordinary decision.

Technical player should:

- see credible cause/effect;
- not perceive progression as one XP bar;
- accept that help improves learning but not autonomy;
- find enough detail when needed.

## 13. Definition of Done

Progression UI is ready when:

- normal mode works without internal vocabulary;
- visible skills bounded;
- one primary monthly explanation exists;
- routine aggregated;
- readiness not a spreadsheet;
- partial/failure honest;
- accessibility stories pass;
- advanced view is not required for MVP.
