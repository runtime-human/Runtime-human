# Баланс и массовые симуляции

Нормативные спецификации:

- [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Назначение

Ручное прохождение не обнаруживает редкие soft locks, экономические разрывы, деградацию programmer fantasy, evidence farming, доминирующие стратегии и невозможные карьерные пути. Поэтому core должен запускаться headless через CLI.

Balance simulator проверяет не только выживаемость персонажа, но и корректность разделения mastery, fluency, evidence, awarded grade и current market readiness.

## Balance simulator

```bash
pnpm balance:simulate --runs 10000 --scenario canonical-1990
```

CLI использует production Game Core и versioned content registry, но автоматического policy player вместо UI.

## Policy players

- balanced learner;
- passive course grinder;
- project-first learner;
- optimal challenge seeker;
- easy-task farmer;
- newest-technology chaser;
- legacy specialist;
- deep specialist;
- broad generalist;
- cautious corporate;
- aggressive career switcher;
- open-source maintainer;
- founder/management shortcut seeker;
- family-first;
- health-constrained;
- low-income recovery;
- interrupted-career returner;
- random-but-valid;
- adversarial min-max/exploiter.

## Programmer-first metrics

### Решения и ритм

- programmer-core decision share;
- direct technical decision share;
- meaningful decisions per month/year;
- months with professional outcome;
- maximum professional stagnation streak;
- quiet month rate;
- blocking events per year;
- life-only blocking share;
- repeated decision/category streaks;
- professional arc starvation.

### Professional progression

- время до первого hands-on result;
- age/access to first programming environment;
- mastery gain by provider/challenge/outcome;
- fluency gain/decay/reacquisition;
- technology familiarity/version recency;
- meaningful evidence events per month;
- routine practice aggregation rate;
- evidence diversity;
- context concentration;
- evidence confidence/autonomy distribution;
- capability-band progression;
- demonstrated grade readiness;
- current market readiness;
- grade award time-to-Intern/Junior/Middle/Senior;
- award stability after breaks;
- false-title/under-titled states;
- specialization switching recovery;
- Top Programmer rarity.

### Anti-farming

- course-grinding mastery/evidence ratio;
- easy-task repeat diminishing;
- intentional-failure claim distribution;
- mentor/assistance autonomy reduction;
- repeated antiRepeatKey suppression;
- shallow breadth detection;
- one-context grade concentration;
- title/salary/fame shortcut attempts;
- management path technical-core retention;
- event-only evidence attempts;
- duplicate evidence ID rate (target zero).

### Технологии

- technology breadth/depth;
- Tier A/B/C exposure;
- adoption by lifecycle stage;
- latest-technology dominance;
- legacy value utilization;
- directed transfer efficiency;
- transfer without target practice (must not create evidence);
- reacquisition time;
- obsolete technology recovery;
- technologies/content never selected.

### Пути

- corporate specialist viability;
- technical leader/architect viability;
- public expert viability;
- freelancer viability;
- open-source maintainer viability;
- founder/CTO viability;
- calm career viability;
- path switching frequency/cost;
- path parity по mastery, autonomy, income, stability, reputation, fame, freedom, influence, workload, risk и legacy;
- Founder/CTO programmer identity retention.

### Projects/provider outcomes

- project completion/failure/recovery;
- quality/debt/bug distributions;
- `ExperienceEpisode` produced per provider/project kind;
- team outcome vs character contribution;
- evidence produced per outcome kind;
- partial outcome incorrectly treated as delivery (target zero);
- delegation/mentoring downstream evidence;
- legacy burden;
- OSS adoption/community health;
- company survival;
- product revenue/sustainability.

### Life/economy/recovery

- unemployment/re-entry;
- income/expense/savings/debt/bankruptcy;
- burnout frequency/duration;
- health/family interruption recovery;
- mastery retained after interruption;
- current market readiness recovery time;
- money utility in late game;
- professional progress by background.

## Target gates

Предварительные gates:

- минимум 60% meaningful decisions относятся к programmer/professional core;
- минимум 40% имеют direct technical component;
- минимум 8 из 12 месяцев имеют professional outcome или объяснимую паузу;
- обычная professional stagnation streak не превышает 3 месяцев;
- life-only blocking streak не превышает 2 без crisis arc;
- grade award не получается только из XP/time/title/salary/fame;
- Senior не достигается без core floors, varied evidence, distinct contexts и duration;
- один context не даёт доминирующую долю qualifying Senior weight;
- passive course grinder не получает production Senior path;
- easy-task farmer поддерживает fluency/reliability, но не обгоняет optimal challenge по mastery/grade evidence;
- mentor abuse не создаёт high autonomy;
- transfer без target practice не создаёт evidence;
- partial/failure outcome не создаёт full delivery/quality claims;
- short break не стирает mastery/awarded grade;
- current market readiness после перерыва имеет recovery path;
- Founder не доминирует одновременно по income, freedom, influence и risk;
- latest-tech-only policy не превосходит стабильно все остальные;
- low-income/interrupted-career scenarios имеют recovery;
- Top Programmer остаётся редким;
- calm corporate path имеет достижимый endgame;
- ни один major path не создаёт mandatory soft lock.

Thresholds versioned и калибруются после playable traces.

## Сценарии

- canonical 1990 average start;
- low-income/no-home-computer;
- high/low Reasoning Aptitude;
- high/low Learning Adaptability;
- weak equipment access;
- weak health/high workload;
- strong family commitments;
- course-heavy path;
- project-heavy path;
- easy-task farming;
- newest-tech chasing;
- legacy specialist;
- corporate/architect/open-source/public/freelancer/founder paths;
- specialization switch;
- career break and return;
- management-to-IC return;
- no-luck seed corpus;
- adversarial min-max;
- long-run post-2026 future.

## Soft-lock indicators

- нет learnable technology/access/recovery path;
- нет работы/обучения/community/project action;
- debt растёт без restructuring path;
- health/fatigue не позволяет minimum recovery;
- grade gate требует недостижимый evidence type/context;
- specialization устарела без retraining/legacy path;
- relationship/family crisis бесконечно блокирует MonthRun;
- company/OSS failure уничтожает все paths;
- Narrative Director не выдаёт professional milestones;
- UI projection не объясняет стагнацию;
- awarded grade потерян после projection/rules update;
- missing mod делает historical evidence нечитаемым.

## Property tests

- no NaN/overflow/negative invalid units;
- no stuck MonthRun;
- deterministic seed/manifest/policy;
- no duplicate evidence IDs;
- evidence source/context required;
- transfer never produces production evidence;
- provider cannot mutate skill state directly;
- partial outcome never qualifies full delivery;
- assistance increases learning without increasing autonomy improperly;
- mastery does not decay below policy floor after short break;
- reacquisition faster than initial acquisition;
- awarded grade stable under projection rebuild;
- Tier C has no proficiency state;
- ineligible technology/job/event never selected;
- readiness projection reproducible;
- failure state has reachable recovery unless true ending.

## Golden corpus

- first January 1990 programming result;
- assisted vs independent result;
- partial diagnosis;
- easy-task diminishing;
- difficult task with mentor;
- failed task with debugging/recovery claims;
- Beginner→Intern→Junior→Middle→Senior;
- specialization switch;
- unemployment/re-entry;
- career break/return;
- legacy technology success;
- failed product recovery;
- OSS maintainer;
- Founder with delegation;
- calm corporate career;
- late career/retirement.

## Gates и частота

Smoke suite выполняет сотни прогонов в CI. Большая выборка запускается nightly/release.

Изменение skills, evidence, grade profiles, transfer, technology lifecycle или provider mappings требует:

1. baseline report;
2. candidate report;
3. distribution comparison;
4. farming/exploit comparison;
5. migration/compatibility assessment;
6. объяснение regressions;
7. versioned threshold update при намеренном изменении.

## Reports

Machine-readable JSON и human-readable Markdown.

Human-readable report начинается с:

- programmer-first verdict;
- evidence integrity/farming verdict;
- grade award/readiness verdict;
- path parity verdict;
- soft-lock verdict;
- time-to-grade distributions;
- significant regressions.

## Release gate

- programmer-first shares соблюдены;
- no overflow/stuck MonthRun;
- no duplicate/inconsistent evidence;
- vertical-slice content reachable;
- blocking frequency bounded;
- deterministic replay;
- no unexplained grade award;
- no dominant path across all key dimensions;
- recovery scenarios pass;
- no-luck corpus не создаёт массовый soft lock;
- old-grade/projection compatibility corpus проходит.
