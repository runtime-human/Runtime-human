---
title: "PROFESSIONAL-CHALLENGE-BALANCE"
type: simulation
status: draft
canon: true
updated: 2026-07-18
---

# Professional Challenge Balance

## Статус

Нормативная профильная стратегия проверки [Professional Challenge Engine](../game-design/PROFESSIONAL-CHALLENGE-ENGINE.md).

Общий balance strategy остаётся в `BALANCE-SIMULATION.md`. Этот документ определяет только challenge-specific metrics и gates.

## 1. Цель

Проверить, что профессиональные ситуации:

- понятны casual-аудитории;
- не имеют скрытой универсально правильной кнопки;
- отличаются контекстом и trade-off, а не только числом сложности;
- создают правдоподобные outcomes;
- дают recovery;
- не превращаются в XP/evidence farming;
- не повторяются до усталости.

## 2. MVP policy players

- independent-investigation;
- ask-for-help;
- reduce-scope/release-early;
- quality-first/defer;
- random-valid;
- always-first-option exploiter;
- visible-reward maximizer;
- reload/reroll exploiter;
- duplicate-answer exploiter.

Политики не моделируют Senior, teams, incidents или company до появления gameplay.

## 3. MVP metrics

### Comprehension

- time to restate situation goal/problem;
- time to select approach;
- correct prediction of trade-off direction;
- correct explanation of at least two result causes;
- next-step discovery;
- Details usage for ordinary decision;
- perceived genre: situation/game vs quiz/Jira/dashboard.

Starting hypotheses:

- choice understood within 10–20 seconds;
- ≥80% restate the goal/problem without guide;
- majority distinguish at least two approaches;
- majority identify two causal factors after result;
- majority wants to continue to February.

Thresholds remain playtest hypotheses.

### Approach diversity

- selection share by approach;
- success/compromise/partial/failure distribution by approach;
- context-adjusted outcome value;
- dominant approach rate;
- always-first-option performance;
- regret/understanding after outcome;
- unlocked approach use.

No approach may dominate unrelated declared contexts. A context-specific best approach is acceptable only when forecast/trade-off makes the reason understandable and alternatives remain viable for different goals.

### Causality

- outcome has 1–3 stable reason codes;
- selected approach materially affects result;
- skill/technology/context effects are explainable;
- assistance increases learning/safety without false autonomy;
- compromise is visible near success;
- failure has concrete learning/recovery;
- same seed/snapshot produces same explanation.

### Repetition

- repeated situation fingerprint frequency;
- repeated wording frequency;
- archetype/context/cause distribution;
- consecutive blocking challenge count;
- quiet-month ratio;
- same approach selected repeatedly because of wording/reward.

MVP has one authored situation, so first slice checks fixture diversity rather than long-term repetition. First-year gate adds corpus metrics.

## 4. Deterministic fixtures

Required:

1. independent clean success;
2. assisted success;
3. reduced-scope release with known limitation;
4. defer with preserved quality;
5. partial diagnosis;
6. failed with learning and February recovery;
7. low-capacity variant;
8. unavailable help with explanation;
9. close/restart before answer;
10. close/restart after provisional outcome;
11. duplicate answer/resume;
12. provider revision conflict/recovery.

Each fixture records:

- situation/template/content version;
- available approaches;
- selected approach;
- realized complication;
- outcome class/bands;
- reason codes;
- provider effects proposal;
- episode facts;
- capability candidate;
- trace hash.

## 5. Property tests

- visible challenge never rerolls;
- duplicate answer does not duplicate outcome/provider/progression;
- unavailable approach cannot resolve;
- Provider/Challenge/Progression ownership is enforced;
- partial/failure never maps to full delivery;
- assisted never maps to independent autonomy;
- content cannot directly mutate state;
- outcome reason codes are stable and localizable;
- every non-ending failure has recovery/next step;
- every normal situation has 2–4 valid approaches;
- no exact numeric reward/probability is required by normal UI.

## 6. Dominance tests

For each context corpus:

- run all available approaches against the same stable snapshots;
- compare multi-objective outcomes, not one scalar success score;
- check completion, quality, time, compromise, autonomy, learning and recovery;
- identify approach that weakly dominates all others;
- reject or redesign templates where dominance is not intentional/tutorial-only.

Do not solve dominance by adding arbitrary random penalties. Change context, forecast, approach cost or outcome trade-off.

## 7. Farming tests

Reject when:

- repeating an easy situation is fastest path to grade;
- asking for help grants independent capability;
- failure deliberately farmed grants full delivery evidence;
- switching technologies without meaningful practice grants evidence;
- abandon/restart produces new complication/outcome;
- player can inspect exact hidden values and reload for a better result.

## 8. Playtest gates before corpus expansion

New archetype/context is added to required scope only when:

1. first situation is understood;
2. result causality is trusted;
3. current corpus shows repetition or missing professional fantasy;
4. new content creates a distinct decision, not renamed numbers;
5. normal UI remains within complexity budget;
6. fixtures and localization cost are covered;
7. no new authoritative field is introduced without gameplay need.

## 9. First-year metrics

When Phase 2 exists:

- challenge months vs quiet months;
- archetype distribution;
- context/cause diversity;
- repeated fingerprint interval;
- approach diversity by player strategy;
- milestone cadence;
- technical outcomes per year;
- recovery frequency/success;
- situation starvation;
- player fatigue/skipping;
- no universal best approach across year.

## 10. Release gate

First playable challenge layer passes when:

- normal UI is sufficient;
- situation/approaches understood;
- trade-off prediction is directionally correct;
- causal report understood;
- no reroll/duplicate;
- assisted/partial/failure semantics correct;
- recovery reachable;
- no obvious globally dominant approach;
- accessibility/long RU pass;
- majority wants the next professional situation.
