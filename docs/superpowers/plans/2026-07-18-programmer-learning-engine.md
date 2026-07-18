# Programmer Learning Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement one deterministic 1990-era learning path from source/access choice to practice result, `ExperienceEpisode`, capability explanation and project challenge.

**Architecture:** Access is a read-only projection from equipment/era/NPC/economy. A Learning Provider creates `LearningOpportunity`; `game-core` resolves one approach into `LearningOutcome`; technical problems delegate to Professional Challenge Engine; Progression Core alone applies mastery/familiarity/evidence effects.

**Tech Stack:** TypeScript 7, Vitest, game-schema/Zod, integer/fixed-point rules, React 19, Storybook 10, Playwright, existing MonthRun and Tauri/Rust/SQLite boundaries.

## Global Constraints

- Active profile: MVP Casual.
- No knowledge XP or daily learning schedule.
- Blocking opportunity exposes 2–4 approaches.
- January retains only one required project blocking decision.
- Learning content cannot mutate access, project or professional state.
- Visible outcomes do not reroll after resume.
- Normal UI requires no exact hidden values.

---

### Task 1: Learning IDs and domain contracts

**Files:**
- Create: `packages/shared-kernel/src/ids/learning-ids.ts`
- Create: `packages/game-core/src/learning/learning-types.ts`
- Modify: public `index.ts` exports
- Test: `packages/game-core/src/learning/learning-types.test.ts`

**Produces:** `LearningSourceId`, `LearningOpportunityId`, `LearningApproachId`, `LearningAttemptId`, `LearningOutcomeId`, `AccessRouteId`, `LearningAccessSnapshot`, `LearningOpportunity`, `LearningAttempt`, `LearningOutcome`.

- [ ] Write compile/runtime tests constructing one valid opportunity and preventing accidental ID interchange.
- [ ] Run `pnpm --filter game-core test -- learning-types.test.ts`; expect missing-contract failure.
- [ ] Implement readonly contracts using existing branded-ID and fixed-point types.
- [ ] Export through package APIs; prohibit deep imports.
- [ ] Run focused test plus `pnpm check:fast`; expect PASS.
- [ ] Commit `feat: add programmer learning contracts`.

### Task 2: Content and runtime schemas

**Files:**
- Create: `packages/game-schema/src/learning/learning-content-schema.ts`
- Create: `packages/game-schema/src/learning/learning-runtime-schema.ts`
- Create: `tools/content-validator/src/rules/validate-learning-content.ts`
- Test: `tools/content-validator/src/rules/validate-learning-content.test.ts`

**Produces:** parsers for sources, opportunities, access routes, attempts and outcomes; `validateLearningContent()`.

- [ ] Add failing fixtures for missing goal, invalid approach count, direct skill delta, false independent result, missing access recovery and invalid chronology.
- [ ] Run validator test; expect FAIL.
- [ ] Implement minimal schemas without university, credentials, AI or spacing state.
- [ ] Emit stable issue codes: `learning.missing-goal`, `learning.invalid-approach-count`, `learning.direct-progression-mutation`, `learning.false-independent-outcome`, `learning.no-access-recovery`, `learning.invalid-history`.
- [ ] Run tests; expect PASS.
- [ ] Commit `feat: validate programmer learning content`.

### Task 3: Deterministic attempt resolver

**Files:**
- Create: `packages/game-core/src/learning/learning-reason-codes.ts`
- Create: `packages/game-core/src/learning/resolve-learning-attempt.ts`
- Test: `packages/game-core/src/learning/resolve-learning-attempt.test.ts`

**Interface:** `resolveLearningAttempt(input): LearningOutcome`; pure and mutation-free.

- [ ] Write golden cases: understood example, copied-without-explanation, modified-with-support, independent success, independent partial, hint-assisted, unavailable approach, identical input/trace.
- [ ] Run focused test; expect FAIL.
- [ ] Implement direct typed rules for the first source/opportunity; do not create a generic DSL.
- [ ] Assert passive reading and takeover cannot produce independent application.
- [ ] Run `pnpm --filter game-core test -- learning`; expect PASS.
- [ ] Commit `feat: resolve programmer learning attempts`.

### Task 4: ExperienceEpisode mapping

**Files:**
- Create: `packages/game-core/src/learning/build-learning-episode.ts`
- Test: `packages/game-core/src/learning/build-learning-episode.test.ts`

**Interface:** `buildLearningEpisode(outcome, providerSnapshot): ExperienceEpisode`; preserves optional `ProfessionalChallengeOutcomeId` without recomputing it.

- [ ] Write failing tests for worked example, hint assistance, pair work, independent application, transfer context and challenge reference.
- [ ] Run focused test; expect FAIL.
- [ ] Implement deterministic episode IDs and facts.
- [ ] Verify course/reading facts do not become delivery evidence.
- [ ] Run tests; expect PASS.
- [ ] Commit `feat: create learning experience episodes`.

### Task 5: Persisted MonthRun integration

**Files:**
- Create: `packages/game-application/src/month-run/learning-step.ts`
- Modify: existing MonthRun draft/command/recovery contracts
- Test: `packages/game-application/src/month-run/learning-step.test.ts`

- [ ] Write cases for close before answer, close after provisional outcome, duplicate answer/resume, provider/access revision conflict and optional challenge reference.
- [ ] Run focused test; expect FAIL.
- [ ] Persist opportunity/source/access/feedback snapshots before displaying choice.
- [ ] Persist selected approach, provisional outcome, provider application and episode facts after answer.
- [ ] Reuse existing atomic commit and duplicate guards.
- [ ] Run tests; expect PASS.
- [ ] Commit `feat: persist programmer learning attempts`.

### Task 6: First 1990 content

**Files:**
- Create: `content/learning-sources/1990/basic-manual.jsonc`
- Create: `content/learning-opportunities/1990/input-validation-basics.jsonc`
- Create: `content/access-routes/1990/school-lab.jsonc`
- Create: `content/localization/ru/learning.json`
- Add: compiler golden fixture

- [ ] Confirm an invalid direct-progression fixture is rejected.
- [ ] Author one printed/manual-like source with worked examples and delayed feedback.
- [ ] Author approaches: study example, modify example, request explanation when available.
- [ ] Author home-device and school-lab fallback routes plus incompatible-environment retry.
- [ ] Run `pnpm content:validate && pnpm content:compile`; expect PASS and stable snapshot.
- [ ] Commit `content: add first programmer learning path`.

### Task 7: Normal UI and Storybook

**Files:**
- Create: `packages/game-ui/src/learning/LearningOpportunityCard.tsx`
- Create: `packages/game-ui/src/learning/LearningApproachList.tsx`
- Create: `packages/game-ui/src/learning/LearningResultCard.tsx`
- Create: `packages/game-ui-fixtures/src/learning/learning-fixtures.ts`
- Create: colocated stories and interaction tests

- [ ] Write tests for keyboard selection, unavailable explanation, access route, no exact probability and assisted/independent wording.
- [ ] Add fixtures: available, school-lab-only, mentor unavailable, obsolete source, understood, assisted, independent, partial, routine aggregate and long RU.
- [ ] Implement semantic headings/list or radio behavior/status announcements.
- [ ] Run `pnpm storybook:test -- learning` and game-ui tests; expect PASS.
- [ ] Commit `feat: add casual programmer learning UI`.

### Task 8: Balance and end-to-end verification

**Files:**
- Create: `tools/balance-simulator/src/policies/learning-policies.ts`
- Create: `tools/balance-simulator/src/reports/learning-report.ts`
- Test: learning policy tests
- Create: `apps/desktop/e2e/learning-flow.spec.ts`

- [ ] Implement policies: example-first, independent-first, always-help, buy-best, project-first, easy-repeat, minimum-cost and random-valid.
- [ ] Reject globally dominant source/approach, permanent low-access block, easy-practice farming and assisted autonomy inflation.
- [ ] E2E: choose learning approach, close/resume, verify identical result, enter project challenge, reload committed month, verify one episode.
- [ ] Run `pnpm check:fast`, `pnpm verify`, `pnpm verify:release`; document any command unavailable before scaffold.
- [ ] Commit `test: verify programmer learning flow`.

## Final verification

- [ ] One source/opportunity/access route compiles with stable IDs.
- [ ] No direct progression mutation exists.
- [ ] Guided, assisted and independent outcomes differ.
- [ ] Low-access route reaches meaningful practice.
- [ ] Challenge is referenced, not duplicated.
- [ ] One stable `ExperienceEpisode` reaches Progression.
- [ ] Routine practice aggregates.
- [ ] UI needs no exact hidden values.
- [ ] Storybook covers accessibility and long RU.
- [ ] Balance detects source/help/easy-practice dominance.
- [ ] No unused fields for university, AI or adaptive tutoring.