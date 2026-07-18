# Programmer Learning Balance

## Статус

Нормативная профильная стратегия для [Programmer Learning Engine](../game-design/PROGRAMMER-LEARNING-ENGINE.md).

Общий balance strategy остаётся в `BALANCE-SIMULATION.md`. Этот документ определяет learning/access/mentorship-specific metrics, fixtures и gates.

## 1. Цель

Проверить, что обучение:

- ощущается как развитие способности, а не XP grind;
- быстро приводит к observable practice;
- не имеет универсально лучшего source/approach;
- различает understanding, assistance, independence и transfer;
- даёт recovery при плохом access;
- не превращает месяц в schedule optimizer;
- естественно переходит в проекты и Professional Challenge;
- остаётся причинным после reload/resume.

## 2. MVP policy players

- `worked-example-first`;
- `self-explanation-first`;
- `independent-practice-first`;
- `always-ask-for-help`;
- `always-buy-best-source`;
- `project-first`;
- `repeat-easy-practice`;
- `minimum-cost-access`;
- `random-valid`;
- `reload-reroll-exploiter`;
- `duplicate-answer-exploiter`.

Не моделировать university, AI, career credentials или long-term mentoring before corresponding gameplay exists.

## 3. MVP comprehension metrics

- time to restate learning goal;
- ability to explain difference between two sources;
- time to choose blocking approach;
- correct prediction of help/autonomy direction;
- correct distinction between understanding and independent ability;
- next-step discovery;
- access recovery route discovery;
- perceived genre: programmer growth vs school planner/course marketplace.

Starting hypotheses:

- goal understood within 10 seconds;
- blocking learning choice understood within 10–20 seconds;
- ≥80% identify the observable practice target;
- majority distinguish guided and independent result;
- majority can name two result causes;
- majority wants to continue into project/next month.

Thresholds remain playtest hypotheses.

## 4. Source diversity metrics

For each source profile:

- selection share by context;
- completion and learning outcomes;
- practice/transfer occurrence;
- feedback use;
- access cost/time;
- abandonment/recovery;
- player explanation of source strength/limitation.

Reject when:

- one source weakly dominates all others;
- expensive/prestigious source always wins;
- source selection is decided by one visible gain number;
- source identity is only flavor over the same formula;
- obsolete source is never useful even in a suitable legacy/era context;
- cheap/shared access creates permanent progression deficit.

## 5. Approach diversity metrics

Track:

- selection share by approach;
- outcome distribution;
- comprehension/practice/transfer result;
- assistance/autonomy interpretation;
- time/capacity cost;
- next-step quality;
- repeated approach streaks;
- player regret/trust after report.

No approach may dominate unrelated contexts.

Expected contextual strengths:

- worked example: strong early comprehension, weak solo evidence;
- self-explanation: improves understanding, costs time;
- modify example: bridge to transfer;
- retrieval: useful after prior exposure, risky too early;
- independent practice: autonomy/transfer opportunity, higher failure risk;
- hint: good recovery/learning, limited autonomy reduction;
- pair/mentor: strong feedback, shared result;
- project-first: motivation/authenticity, high uncertainty.

These are tendencies, not fixed universal multipliers.

## 6. Access equity metrics

MVP fixtures cover:

- home computer;
- shared family computer;
- school-lab-only;
- no device but printed source;
- low-income used-equipment route;
- language-limited source;
- temporary mentor/club access;
- unavailable/obsolete environment with retry route.

Metrics:

- time to first runnable example;
- time to first modification;
- time to first independent practice;
- months fully blocked;
- cost burden;
- number of viable routes;
- recovery success;
- long-term capability gap after equal opportunity count.

Hard gates:

- every start has a reachable meaningful practice route;
- no background is blocked indefinitely;
- wealth changes convenience/speed, not hard capability ceilings;
- low-access route can reach first project within a reasonable first-year window;
- blocked state always explains reason and route/retry condition.

## 7. Mentorship/help metrics

- help request frequency;
- mentor availability and subject fit;
- learning gain vs autonomy interpretation;
- transition from assisted to independent practice;
- repeated trivial-help aggregation;
- dependency/dominance rate;
- mentor relationship opportunity value;
- pair contribution clarity.

Reject when:

- `ask for help` is always optimal;
- mentor availability guarantees success;
- guided walkthrough confirms independent capability;
- takeover grants meaningful learning/evidence;
- refusing help is always optimal for grade;
- mentor becomes a permanent flat multiplier;
- one mentor relationship is required for all viable paths.

## 8. Learning progression metrics

Milestone cadence:

```text
first exposure
→ first explanation
→ first reproduction
→ first modification
→ first independent application
→ first transfer
```

Track:

- months to each milestone;
- number of distinct contexts;
- source/approach diversity;
- repeat count before transfer;
- partial/failure recovery;
- project appearance timing;
- learning-only months before first authentic result.

First-year gate:

- learning does not remain a prologue for most of the year;
- first personal project begins early;
- at least one capability is transferred to a new context;
- no single repeated exercise is fastest route to Intern readiness;
- routine practice is present but not perceived as grinding.

## 9. Spacing/retrieval/interleaving tests

Baseline does not optimize an exact schedule. Tests verify only:

- identical massed repetition receives diminishing returns;
- a later revisit can restore fluency and strengthen retrieval;
- retrieval too early can produce partial outcome/recovery;
- varied contexts improve transfer opportunity;
- routine review aggregates without modal spam;
- player is not punished for ignoring an invisible optimal interval.

Recommended simulations may compare mild spacing/interleaving policies, but they cannot become player-facing mandatory calendar mechanics without playtest evidence.

## 10. AI-era tests

Deferred until AI-era gameplay exists. Required future policies:

- explanation-first;
- hint-first;
- generate-example-and-modify;
- full-solution-delegation;
- verify-generated-output;
- unaided-transfer-after-AI;
- trust-all-AI exploiter;
- reject-all-AI.

Future gates:

- full delegation may improve delivery but not independent capability;
- explanation/verification paths remain viable;
- incorrect AI output can be detected by suitable capability;
- AI is neither universally optimal nor artificially useless;
- player understands why AI-assisted result differs from solo evidence;
- no global dependence score is required unless gameplay demonstrates need.

## 11. Deterministic MVP fixtures

1. worked example understood;
2. worked example copied without explanation;
3. example modified with support;
4. self-explanation improves result;
5. independent practice succeeds;
6. independent practice partial with recovery;
7. hint-assisted success;
8. pair result without solo capability;
9. mentor unavailable with alternative route;
10. no-home-computer school-lab path;
11. source unavailable due era/equipment;
12. obsolete/misleading source warning;
13. routine repeated practice aggregation;
14. close/restart before approach;
15. close/restart after provisional outcome;
16. duplicate answer/resume;
17. provider/access revision conflict;
18. learning attempt that invokes Professional Challenge.

Each fixture records:

- source/opportunity/content versions;
- access snapshot/fingerprint;
- available approaches;
- selected approach;
- assistance/feedback snapshot;
- observable artifact;
- learning outcome class/bands;
- optional challenge outcome ref;
- episode facts;
- reason codes;
- next steps;
- trace hash.

## 12. Property tests

- content cannot directly mutate mastery/grade;
- access snapshot cannot invent equipment or NPC relation;
- unavailable approach cannot resolve;
- passive reading cannot produce independent delivery;
- takeover cannot produce independent autonomy;
- pair result cannot silently become solo capability;
- partial/blocked outcome cannot map to full completion;
- every path-blocking access state has route/retry;
- repeated easy practice diminishes/aggregates;
- source prestige/cost does not directly determine learning;
- duplicate answer does not duplicate cost/outcome/episode;
- visible attempt does not reroll;
- challenge result is referenced, not recomputed by Learning Engine;
- Progression alone confirms capability;
- historical source cannot appear before availability;
- normal UI needs no exact hidden values.

## 13. Dominance tests

For each declared context:

- resolve all available sources and approaches against stable snapshots;
- compare multi-objective outcomes: comprehension, practice, transfer, autonomy, time, cost, feedback, recovery;
- identify weakly dominant option;
- distinguish intentional tutorial dominance from systemic dominance;
- redesign affordances/context/cost rather than adding random penalties.

A context-specific best option is acceptable when:

- the reason is visible;
- another goal makes another option viable;
- no permanent snowball follows;
- the player is not choosing from hidden exact rewards.

## 14. Farming/exploit tests

Reject when:

- reading cheap material indefinitely is fastest grade path;
- repeating one exercise creates strong evidence;
- mentor takeover grants autonomy;
- abandoning/restarting rerolls feedback or source quality;
- expensive source can be repeatedly bought for direct mastery;
- pair result is duplicated for both contribution types;
- failed attempts can be farmed for full learning without new reflection/context;
- switching technologies creates familiarity without practice;
- credentials create professional grade;
- player can inspect exact hidden values and reload.

## 15. First-year corpus metrics

When Phase 2 exists:

- opportunities per month;
- blocking learning decisions vs routine months;
- source family distribution;
- access route usage;
- mentor/peer availability;
- practice mode distribution;
- repeated fingerprint interval;
- learning → project transition rate;
- transfer milestone frequency;
- quiet/recovery months;
- early abandonment;
- time to Intern readiness components;
- technology breadth without shallow farming.

Starting content budget hypothesis:

- 3–5 source profiles;
- 2–3 access routes;
- 6–10 learning opportunities;
- maximum one blocking learning decision in an ordinary month;
- at least one project/practice outcome every few months unless explained by interruption;
- at least two viable early strategies.

## 16. Playtest gates before expansion

New learning depth enters required scope only when:

1. current goal/source/result is understood;
2. first project arrives early enough;
3. current sources feel repetitive or implausible;
4. proposed source/approach creates a distinct decision;
5. access route remains recoverable;
6. normal UI stays within complexity budget;
7. fixtures/localization/historical sources exist;
8. no new authoritative state is added without gameplay need.

Examples:

- add mentor compatibility only if mentor outcomes feel arbitrary;
- add retrieval scheduling only if retention/relearning needs explicit gameplay;
- add credentials only with actual education/career gates;
- add AI modes only when timeline reaches them;
- add source quality detail only when misleading/obsolete information creates decisions.

## 17. Release gates

MVP/first-year learning passes when:

- player understands one learning goal and approach;
- observable practice appears quickly;
- guided and independent outcomes are distinct;
- no source/help strategy dominates;
- low-access fixture reaches practice;
- report causality is trusted;
- learning transitions into project/challenge gameplay;
- no duplicate/reroll;
- routine practice is compact;
- majority wants the next professional step;
- no speculative Extended system is required.