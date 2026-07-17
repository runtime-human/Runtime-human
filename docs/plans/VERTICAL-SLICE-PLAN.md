# Vertical Slice Plan

Нормативные спецификации:

- [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Цель

Создать минимальную, но настоящую играбельную цепочку от нового персонажа до сохранённого результата первого месяца января 1990 года.

Vertical slice проверяет не только MonthRun/save/recovery, но и центральную цепочку:

```text
hands-on provider outcome
→ ExperienceEpisode
→ mastery/fluency delta
→ evidence claims
→ capability/readiness explanation
→ atomic commit/restart
```

## Gameplay question

> Интересно ли игроку прожить первый месяц будущего программиста и понимает ли он, чему научился, что доказал и какой следующий шаг открыл?

Если игрок помнит только комнату, покупку, семейное событие и сохранение, но не технический результат, slice не прошёл gameplay validation.

## Scope

Игрок:

1. создаёт персонажа 12 лет;
2. начинает в комнате родителей;
3. имеет семейное/финансовое состояние и background доступа к технике;
4. видит historically appropriate beginner technology либо путь к доступу;
5. выбирает обучение и professional focus;
6. запускает одну hands-on activity;
7. принимает свободную покупку при наличии денег;
8. видит forecast commitments/equipment/load/likely outcome;
9. нажимает `Следующий месяц`;
10. получает автоматические school/home commitments;
11. сталкивается с technical uncertainty/problem decomposition/debugging;
12. при необходимости получает blocking decision;
13. закрывает приложение и возобновляет persisted MonthRun;
14. получает independent, assisted, partial или failure outcome;
15. provider формирует `ExperienceEpisode`;
16. Progression Core обновляет mastery/fluency и technology familiarity;
17. создаются evidence claims либо practice aggregate;
18. отображается capability/readiness explanation;
19. открывается следующий шаг на февраль;
20. после restart загружается тот же committed result без duplicate evidence.

## Минимальная progression model

### Aptitudes

- Reasoning Aptitude;
- Learning Adaptability.

Aptitudes фиксируются background/character setup и не требуют отдельной progression UI в slice.

### Skills

Только пять:

- Problem Solving;
- Programming;
- Debugging;
- Data Modelling;
- Testing & Quality.

### Technology

- одна `TechnologyFamilyDefinition`;
- одна historically available Tier A/B technology;
- conceptual/operational familiarity;
- без major version graph.

### Capability bands

- Guided;
- Routine;
- Independent;
- Complex.

### Outcome space

- independent completion;
- assisted completion;
- partial diagnosis/progress;
- failure with reachable recovery.

## Beginner technology

- lifecycle/local availability соответствуют январю 1990;
- hardware/access requirements объяснимы;
- UI использует human language;
- transfer graph в slice может иметь только один empty/minimal family edge set;
- Tier C не получает state.

## Hands-on activity и challenge

Activity включает:

- понятную цель;
- один provider-owned task/work package;
- небольшую техническую неопределённость;
- один choice approach;
- expected work units/calendar span;
- available help/feedback;
- partial/failure/recovery;
- skill/technology applications;
- stable `ExperienceEpisode` output.

Допустимые choices:

- разбить задачу;
- проверить условие/ввод;
- сравнить с примером;
- попросить помощь;
- продолжить исследование;
- оставить partial result и вернуться.

Это не реальный IDE/coding puzzle.

## First ExperienceEpisode

```ts
type ExperienceEpisode = Readonly<{
  id: ExperienceEpisodeId;
  provider: 'education';
  source: ExperienceSourceRef;
  period: GameDateRange;
  challenge: ChallengeProfile;
  participation: ParticipationProfile;
  practice: PracticeProfile;
  outcome: OutcomeProfile;
  feedback: FeedbackProfile;
  skillApplications: readonly SkillApplication[];
  technologyApplications: readonly TechnologyApplication[];
  contextFingerprint: ContextFingerprint;
}>;
```

## First evidence

`ProfessionalEvidenceEvent` содержит:

- deterministic ID;
- source/context snapshot;
- outcome;
- assistance;
- claims;
- antiRepeatKey;
- rules/content/trace IDs.

Минимальные claim dimensions:

- craft;
- autonomy;
- quality либо debugging/recovery;
- delivery только для full completion.

Partial/failure не создают full delivery claim.

Slice не требует grade promotion. `ProfessionalGradeAward` может отсутствовать; read model показывает readiness/capability progress.

## Обязательные технические элементы

- pnpm monorepo;
- TypeScript 7 exact pinned;
- Vite 8/Oxc;
- Tauri shell;
- React/design tokens/Storybook 10;
- shared kernel IDs/GameDate/Money/fixed-point;
- TypeBox/Ajv schemas;
- deterministic RNG/Manifest;
- Gregorian calendar;
- Begin/Resume/Recover MonthRun;
- Rust persistence boundary;
- no SQL execute capability;
- SQLite 3.51.3+ gate;
- schema/migration 001;
- backup/restore smoke;
- JSONC content pack;
- Event/Narrative minimum;
- `CharacterProfessionalState`;
- `ExperienceEpisode` contract;
- mastery/fluency/familiarity minimum;
- claims-based evidence;
- deterministic evidence IDs;
- readiness read model;
- Russian localization;
- Vitest/fast-check/Storybook/Playwright/WebdriverIO.

## Storybook minimum

### Foundation

- app shell/date/resource bar;
- loading/empty/error;
- long Russian text;
- keyboard/200%/high contrast/reduced motion.

### Programmer core

- professional focus;
- learning activity;
- beginner technology;
- technical challenge/choice;
- skill capability summary;
- mastery vs fluency explanation;
- evidence claims;
- readiness summary;
- pre-month forecast;
- programmer-first report.

### MonthRun/recovery

- blocking decision;
- suspended run;
- draft evidence state;
- save/recovery;
- quiet month.

## Content minimum

- один HomeCityProfile и era 1990–1994;
- 3 backgrounds доступа без permanent bad start;
- 5 early technologies в каталоге, но только одна обязана иметь full slice progression;
- 1 technology family;
- 5 skill definitions;
- 1 activity definition;
- 1 challenge template;
- 4 provider outcomes;
- 1 evidence template/reason-code set;
- 3 learning options максимум;
- 6–10 events, большинство связано с learning/equipment/school/professional context;
- 3 equipment variants;
- 2 housing states;
- report templates.

## Decision-density targets

- 2–4 meaningful decisions;
- минимум 2 programmer-core;
- максимум 1 life-only blocking;
- минимум 1 non-blocking technical observation;
- no required jargon;
- advanced explanation available.

## Persistence/recovery fixtures

- close at technical blocking decision;
- duplicate answer/resume;
- crash before provider outcome;
- crash after episode before progression assessment;
- crash after draft evidence before commit;
- crash after commit before cleanup;
- duplicate evidence ID;
- incompatible progression/content fingerprint;
- failed migration;
- backup restore;
- Safe Mode/export.

## Balance fixtures

- average background;
- no-home-computer/low-income access;
- high/low Reasoning Aptitude;
- high/low Learning Adaptability;
- assisted outcome;
- independent outcome;
- partial diagnosis;
- failure-first recovery;
- quiet month.

Каждый run имеет reachable programmer outcome или объяснимый доступ в феврале.

## Acceptance criteria

### Programmer fantasy

- игрок объясняет, чему научился;
- skill и technology различимы;
- task/provider outcome traceable;
- assistance повышает learning, но не autonomy claim;
- partial/failure не считаются full delivery;
- evidence создаётся только из episode/outcome;
- readiness/capability соответствует claims;
- следующий шаг понятен;
- report начинается с programmer development;
- бытовые KPI не доминируют.

### Determinism/recovery

- одинаковый seed/manifest даёт одинаковый trace/delta/evidence IDs;
- duplicate decision/resume/commit не дублирует evidence;
- main save не содержит half-applied progression;
- provider outcome + professional delta/evidence atomic;
- save/restart round trip;
- no raw SQL capability;
- WebdriverIO: create → learn → suspend → restart → resume → episode → evidence → commit → reload.

### UX/accessibility

- keyboard-only;
- Storybook/a11y/visual baseline;
- novice understands cause without external guide;
- expert finds advanced claims/state;
- long RU/200% scale works.

### Verification

- `pnpm verify`;
- architecture/docs/research traceability;
- balance fixtures show no access soft lock, duplicate evidence or farming shortcut.

## Не входит

- полноценная работа/Junior path;
- full project/product engine;
- full grade awards/gates;
- company/OSS community;
- full transfer matrix;
- specialization profiles;
- evidence compaction;
- Top Programmer/leadership evidence;
- user mods/updater/multiple eras/cities/backend/cloud VRT/Content Studio;
- real IDE/code validation.
