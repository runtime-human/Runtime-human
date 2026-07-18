---
title: "BALANCE-SIMULATION"
type: simulation
status: draft
canon: true
updated: 2026-07-18
---

# Баланс и массовые симуляции

Нормативные источники:

- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md).

## 1. Назначение

Balance strategy должна соответствовать реализованному профилю сложности.

Нельзя требовать от MVP Casual симуляций систем, которых ещё нет. Ранние gates проверяют:

- понятность;
- ритм;
- причинность;
- отсутствие простых exploits;
- recovery;
- желание продолжать.

Long-term economic, team, Senior и portfolio metrics добавляются вместе с соответствующим gameplay.

## 2. Три уровня проверки

## 2.1. MVP Casual

Использует небольшой deterministic fixture corpus и ручные usability tests.

Проверяет:

- first-month reachability;
- same seed/restart;
- one meaningful decision;
- visible concepts;
- professional/project outcome;
- assisted/independent/partial/failure semantics;
- no duplicate result;
- no tiny-project/easy-task obvious exploit;
- no bad-start soft lock.

10 000 массовых прогонов не являются обязательными до появления стабильного core/tooling. Достаточно unit/property/golden fixtures и небольшой simulation sample.

## 2.2. Recommended

После первого playable year:

- сотни/тысячи runs;
- time-to-Intern/Junior;
- strategy diversity;
- event repetition;
- technology choices;
- multiple projects;
- simple debt/issue recovery;
- unemployment/re-entry;
- path balance.

## 2.3. Extended

После появления late systems:

- Senior/Top Programmer;
- companies/teams/delegation;
- debt spirals;
- incidents/rollback;
- portfolio scaling;
- long-term economy;
- evidence compaction;
- post-2026 futures.

## 3. MVP policy players

Only:

- balanced learner;
- ask-for-help learner;
- independent learner;
- speed-first/release-early;
- quality-first/delay;
- easy-task repeater;
- project restart/abandon exploiter;
- low-income/no-equipment start;
- random valid.

Do not implement founder, large-team, rollback or Senior policies before systems exist.

## 4. MVP product metrics

### Comprehension/playtest

- time to explain current goal;
- time to choose ordinary decision;
- correct prediction of consequence direction;
- correct explanation after MonthRun;
- next-step discovery;
- percentage wanting to continue;
- perceived genre: game vs dashboard/task manager.

Starting hypotheses:

- ordinary choice understood within 10–20 seconds;
- ≥80% explain first-month goal without guide;
- majority correctly name two causes after report;
- majority wants to continue to February;
- advanced/details view not needed for ordinary choice.

Thresholds require real playtest and may change.

### Complexity

- primary objects per screen: target 3–5;
- visible skills: target 3, maximum 5;
- active packages shown: target 1, maximum 3;
- blocking decisions in ordinary month: target 0–1;
- monthly report primary rows: target 5–7;
- jargon terms requiring explanation: target zero in normal mode.

### Progression

- first visible learning outcome reachable;
- assisted learning does not grant independent status;
- partial/failure not full delivery;
- repeated easy practice diminished;
- short break/restart does not erase state;
- provider cannot mutate grade directly;
- no duplicate progression result.

### Project

- goal/current package understandable;
- project has meaningful trade-off, not one progress bar;
- package count bounded;
- uncertainty does not reroll;
- three qualities sufficient for decision;
- debt/known issue has future consequence;
- release/delay/recovery reachable;
- no duplicate project/release result.

## 5. MVP deterministic fixtures

- independent success;
- assisted success;
- simplified early release/minor debt;
- delayed release/good maintainability;
- partial diagnosis;
- failed attempt with February recovery;
- low-income/no-home-computer path;
- quiet month;
- close/restart at decision;
- duplicate answer/resume;
- project abandon/restart exploit attempt;
- repeated easy-task attempt.

## 6. MVP property tests

- no invalid negative/overflow units;
- deterministic seed/order/manifest;
- duplicate commands idempotent;
- terminal package does not progress;
- hidden outcome stable after restart;
- partial not full completion;
- assisted not independent;
- project provider cannot mutate professional state;
- awarded grade not created by XP/time;
- release/history immutable after commit;
- recovery path exists for non-ending failure.

## 7. Playtest gates before Recommended profile

Recommended complexity is blocked until:

1. first month is understood;
2. one year prototype shows repetition/problem requiring depth;
3. players ask for or benefit from specific detail;
4. current model produces identifiable exploit or implausible outcome;
5. proposed feature improves comprehension/retention or strategy diversity;
6. added UI/content/test burden is measured.

Examples:

- add forecast confidence only if players misread forecast;
- add debt records only if one debt band cannot explain choices;
- add situational security only when relevant project exists;
- add evidence details only if grade/result feels untrustworthy;
- add team contribution only with actual team gameplay.

## 8. Recommended metrics

When systems exist:

- time-to-Intern/Junior;
- professional outcome months;
- skill/technology strategy diversity;
- event/category repetition;
- project completion/abandon/recovery;
- 2–5 package distribution;
- scope/quality trade-off frequency;
- debt band consequences;
- known issue/incident rate;
- job search/unemployment recovery;
- life/professional balance;
- path parity;
- no evidence/project farming.

## 9. Extended metrics

Only later:

- Middle/Senior readiness;
- full evidence/context diversity;
- team vs player contribution;
- delegation/micromanagement;
- debt ledgers/spirals;
- defects/incidents/rollback;
- maintenance/legacy/migrations;
- company portfolio;
- Top Programmer rarity;
- long-term compaction.

## 10. Soft-lock indicators

MVP:

- no route to technology/access;
- project has no continue/release/recovery option;
- failure gives no next step;
- life constraint blocks all professional actions indefinitely;
- UI cannot explain stagnation;
- restart loses/corrupts result;
- missing content makes save unreadable.

Later indicators are added with later systems, not simulated speculatively.

## 11. Change gate

Any new gameplay depth requires:

1. current problem evidence;
2. simpler alternatives considered;
3. player-facing choice/consequence;
4. normal UI design;
5. fixture/playtest criterion;
6. migration/state cost;
7. deferred alternative documented.

## 12. Reports

MVP report begins with:

- comprehension verdict;
- casual complexity verdict;
- deterministic/recovery verdict;
- progression causality verdict;
- project trade-off verdict;
- obvious exploit/soft-lock verdict;
- desire-to-continue result.

It does not contain empty sections for unimplemented Extended systems.

## 13. Release gate for first playable

- first month reachable;
- normal UI sufficient;
- choice understood;
- causal report understood;
- no duplicate/reroll;
- accessibility pass;
- no obvious farming/bad-start soft lock;
- majority playtesters want to continue;
- no speculative Extended system required.
