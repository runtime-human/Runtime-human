---
title: "CHARACTER-PROGRESSION"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Прогрессия персонажа

Нормативные спецификации:

- [Programmer-First Design](PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression & Evidence Engine](PROFESSIONAL-PROGRESSION-ENGINE.md);
- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Принцип

Основная долгосрочная прогрессия Runtime Human — становление программиста. Жизненные статусы, деньги, отношения, имущество, должности и публичность меняют возможности и последствия, но не заменяют развитие профессионального мастерства.

## Слои прогрессии

1. Aptitudes — узкие медленно меняющиеся modifiers.
2. Skills — переносимые профессиональные способности.
3. Technology familiarity — конкретные языки/frameworks/platforms.
4. Professional focus — выбранный приоритет игрока.
5. Experience episodes — provider outcomes.
6. Professional Evidence — подтверждённая история результатов.
7. Grade awards — достигнутые professional milestones.
8. Grade/market readiness — projections.
9. Specialization profile — derived профессиональный профиль.
10. Position/role/title — организационный контекст.
11. Reputation/fame/traits/life statuses — другие независимые системы.

## Aptitudes

Baseline:

- Reasoning Aptitude;
- Learning Adaptability.

Они:

- не заменяют skills;
- не определяют grade;
- обычно влияют на learning в ограниченном диапазоне;
- меняются редко;
- могут компенсироваться практикой, mentor, tools и временем;
- не создают permanent bad start;
- не являются главным scoreboard.

Self-Organization моделируется planning/delivery skills и current statuses. Communication — профессиональным skill. Focus/fatigue — current capacity. Creativity/Curiosity/Persistence — traits.

`Coding`, `Engineering` и `Quality` не являются базовыми характеристиками: их progression находится в skill/evidence model.

## Skills

Authoritative `SkillState` разделяет:

- mastery;
- fluency;
- last practice;
- strongest demonstrated capability band.

Mastery отражает устойчивое понимание и почти не деградирует. Fluency отражает текущую скорость/уверенность и может снижаться после длительного перерыва к floor, основанному на mastery.

## Technology familiarity

Authoritative technology state разделяет:

- conceptual familiarity;
- operational familiarity;
- version band/recency;
- last practice.

Technology familiarity не является transferable skill. Strong skills ускоряют освоение новой technology, но не создают production evidence без практики.

## ExperienceEpisode

Education, Project, Career, Open Source, Company и Event providers создают нормализованный `ExperienceEpisode`.

Episode содержит:

- source/context;
- challenge;
- participation/autonomy/assistance;
- practice;
- outcome;
- feedback;
- applied skills/technologies.

Provider не изменяет professional state напрямую.

## Три разных результата опыта

### Mastery gain

Зависит от challenge match, novelty, feedback, reflection, capacity и diminishing returns.

### Fluency/familiarity

Зависят от практики, outcome stability, technology/version use и reacquisition.

### Evidence

Зависит от реально продемонстрированного challenge band, completion, quality, autonomy, confidence, context novelty и anti-repeat.

Помощь может повысить learning и снизить autonomy evidence. Провал может дать debugging/recovery learning, но не delivery/quality evidence.

## Professional Evidence

Meaningful outcome создаёт immutable `ProfessionalEvidenceEvent` с отдельными `EvidenceClaim`.

Routine practice сворачивается в `MonthlyPracticeAggregate`.

Evidence обязательно имеет source/context snapshot и не исчезает при удалении исходного content/mod definition.

## Grade model

Grade не является XP, weighted average, стажем, зарплатой, title или fame.

Core dimensions:

- Craft;
- Complexity;
- Autonomy;
- Quality;
- Delivery/Ownership.

Profile dimensions:

- Depth;
- Breadth/Transfer;
- Leverage/Collaboration;
- Impact.

Grade требует:

- floors по core dimensions;
- нескольких qualifying claims;
- distinct contexts;
- устойчивости во времени;
- подходящего professional profile;
- отсутствия critical deficit.

Capability bands:

```text
Observed → Guided → Routine → Independent → Complex → Systemic → Strategic → Frontier
```

## Award и readiness

`ProfessionalGradeAward` является authoritative milestone.

Derived:

- Demonstrated Grade Readiness;
- Current Market Readiness;
- Specialization Profile;
- capability explanations.

Длительный перерыв может снизить current fluency/market readiness, но не отменяет award автоматически.

## Грейды

### Beginner

Guided/Routine learning tasks; понимает простые программы и изменяет их с помощью.

### Intern

Supervised real contribution, регулярный feedback, ограниченная production responsibility.

### Junior

Independent bounded tasks, debugging, testing и delivery в понятном scope.

### Middle

Feature/subsystem ownership end-to-end, ambiguity, design и collaboration.

### Senior

Systemic ambiguity, risk, architecture, sustained delivery, mentoring и technical direction.

### Top Programmer

Редкий endgame-status, требующий длительного strategic/frontier impact и achievements. Не является обычным следующим threshold.

## Promotion, title и grade

Разделяются:

- professional grade;
- position;
- role;
- title;
- company level;
- salary band;
- reputation/fame.

Возможны Middle на Junior-position, завышенный title, Senior IC, strong OSS maintainer без corporate title и rusty Senior с низкой current market readiness.

## Specialization

- `ProfessionalFocus` — authoritative выбранный приоритет;
- `SpecializationProfile` — derived из evidence/skills/technologies/contexts.

Путь:

```text
general beginner
→ exploratory profile
→ emerging specialization
→ established specialization
→ deep specialist / broad senior / technical leader
```

Смена specialization сохраняет mastery/transfer и требует новых production contexts.

## Snowballing и плохой старт

- доступ к технике ускоряет первые шаги, но не даёт grade;
- aptitude не заменяет evidence;
- слабый старт компенсируется community, mentor, school resources, used equipment и временем;
- wealth/reputation/fame не покупают mastery;
- latest technology не является автоматическим оптимумом;
- routine task farming ограничено diminishing/aggregation;
- один project/context не закрывает Senior gates;
- interruption имеет recovery/reacquisition path.

## Отрицательные состояния

Burnout, болезнь, конфликт и потеря мотивации являются statuses/risks.

Они могут временно снижать capacity, fluency и current market readiness, но не стирают mastery и не понижают awarded grade автоматически.

## UI раскрытие

Normal mode показывает capabilities:

- «может самостоятельно исправлять небольшие ошибки»;
- «уверенно завершает понятные задачи»;
- «готов владеть небольшой feature end-to-end».

Advanced mode показывает evidence, dimensions, technology transfer и причины readiness. Exact hidden weights не обязательны.

## Balance metrics

- skill gain by source/challenge;
- mastery/fluency separation;
- evidence diversity/context concentration;
- time-to-grade;
- current market readiness/reentry;
- easy-task/course/mentor farming;
- specialization switching;
- grade award stability;
- Top Programmer rarity.
