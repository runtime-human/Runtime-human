# Баланс и массовые симуляции

Нормативные спецификации:

- [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md);
- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014](../adr/ADR-014-authoritative-project-work-package-model.md).

## Назначение

Headless simulation detects soft locks, evidence/project farming, debt spirals, defect/release imbalance, dominant strategies and loss of programmer fantasy.

```bash
pnpm balance:simulate --runs 10000 --scenario canonical-1990
```

Production core/content registry; policy player instead of UI.

## Policy players

### Professional

- balanced learner;
- passive course grinder;
- project-first learner;
- optimal challenge seeker;
- easy-task farmer;
- newest-tech chaser;
- legacy specialist;
- deep specialist/broad generalist;
- cautious corporate/aggressive switcher;
- OSS maintainer/founder/management shortcut;
- family/health/low-income/interrupted-career;
- random valid/adversarial exploiter.

### Project-specific

- tiny-project spammer;
- Work-Package splitter;
- intentional-failure/bug farmer;
- debt-create-and-repay farmer;
- release spammer;
- perfection staller;
- overparallelizer;
- huge-team scaler;
- micromanager;
- zero-oversight delegator;
- quality-first/delivery-first;
- refactor-first/patch-first;
- early-release risk taker;
- project abandon/reset exploiter.

## Programmer-first metrics

### Rhythm

- programmer/professional decision shares;
- meaningful decisions/month/year;
- professional outcome months/stagnation;
- quiet/blocking/life-only event rates;
- professional arc starvation.

### Progression

- mastery/fluency/familiarity;
- evidence volume/diversity/confidence/autonomy/context concentration;
- capability/grade readiness/award timing;
- current market readiness/recovery;
- title mismatch/specialization/Top Programmer rarity.

### Anti-farming

- passive-course production evidence;
- easy-task diminishing;
- failure/mentor/event/title/salary/fame shortcuts;
- antiRepeat suppression;
- duplicate evidence target zero;
- management technical identity.

### Technologies and paths

- breadth/depth/Tier exposure;
- transfer/reacquisition/legacy/latest-tech dominance;
- path parity and switching;
- corporate/architect/OSS/public/freelancer/founder/calm career viability.

## Project metrics

### Work Package flow

- packages created/active/resolved per project-year;
- package duration distribution;
- active package count and overparallelization;
- completed/partial/failed/recovered ratios;
- blocked/suspended duration;
- meaningful decisions per package;
- package split/anti-repeat concentration;
- work lost to coordination/continuity/debt drag;
- known vs revealed latent work;
- forecast optimistic/likely/cautious error and calibration.

### Scope and delivery

- scope added/cut/deferred frequency;
- requirement volatility;
- milestone/release delay;
- project completion/abandon/transfer/sale rates;
- time-to-first-release/time-between-releases;
- empty/minor release spam;
- perfection-stall duration/opportunity cost;
- project reset/abandon exploit.

### Quality

- active dimension count;
- target/assessed/confidence distribution;
- quality trade-off frequency;
- release quality by archetype/path;
- low-confidence releases;
- critical gate bypass/accepted-risk rate;
- one-dimension dominance;
- impossible/trivial quality profiles.

### Technical debt

- debt aggregate/significant records per project-year;
- intentional vs accidental debt;
- principal/drag/risk distribution;
- work consumed by debt drag;
- debt repayment/containment/spiral rate;
- debt-created-and-repaid farming;
- debt recovery time;
- projects soft-locked by debt.

### Defects and incidents

- latent risk injection/materialization;
- known/escaped defect severity;
- incident/regression/rollback rates;
- defect discovery timing;
- fix/workaround/defer choices;
- repeated bug farming;
- project archetype/quality/debt correlation;
- no-luck and high-risk seed outcomes.

### Teams and contribution

- direct/review/architecture/mentoring/delegation contribution shares;
- team result vs character contribution divergence;
- huge-team throughput vs coordination;
- micromanagement/zero-oversight outcomes;
- owner clarity/key-person risk;
- delegation-credit over-attribution target zero;
- project outcome → episode/evidence mapping.

### Releases and maintenance

- release gate pass/fail/override;
- rollback/hotfix/incident after release;
- accepted debt/known issues;
- maintenance load by size/debt/dependency/support;
- maintenance package frequency;
- legacy/migration project viability;
- immutable release/history integrity.

## Life/economy/recovery metrics

- unemployment/re-entry;
- income/savings/debt/bankruptcy;
- burnout/health/family interruption;
- mastery/market readiness recovery;
- product/company/project failure recovery;
- money utility/background parity.

## Target gates

Starting hypotheses:

### Programmer progression

- ≥60% meaningful decisions programmer/professional core;
- ≥40% direct technical component;
- ≥8/12 months professional outcome or explained pause;
- grade not from XP/time/title/salary/fame;
- Senior requires varied contexts/duration;
- transfer without practice creates no evidence;
- partial/failure no full delivery;
- short break preserves mastery/awarded grade;
- all major paths recoverable/viable.

### Project

- ordinary package has 0–2 blocking decisions; major/incident 1–4;
- casual direct active package count normally 1–4;
- package median duration meaningful, not daily-click or multi-decade stall;
- forecast likely range calibrated without exact certainty;
- latent work never rerolls;
- ProjectState cannot be represented only by one progress/quality score;
- tiny-project/package-splitting/release-spam policies do not outperform sustained projects;
- debt improves short-term trade-off but creates measurable future cost/risk;
- debt spiral always has at least one recovery/exit unless true ending;
- defect rate neither zero nor unavoidable catastrophe;
- critical release gate bypass only through explicit policy/decision;
- team result is not fully attributed to player;
- headcount scaling is sublinear where coordination/coupling exist;
- delegated project remains viable without hourly micromanagement;
- project failure creates recovery/history, not universal game over;
- duplicate package/release/incident/episode/evidence IDs target zero.

Thresholds versioned and calibrated after playable traces.

## Scenarios

- canonical 1990 project;
- low-income/no-home-computer;
- high/low aptitudes/health/family commitments;
- course/project/easy-task paths;
- newest-tech/legacy;
- corporate/architect/OSS/public/freelancer/founder;
- specialization/career break/management return;
- small personal project;
- work/freelance/open-source/product projects;
- high uncertainty;
- quality critical project;
- debt shortcut then change;
- latent defect/incident/rollback;
- overparallelized portfolio;
- small vs large team;
- micromanaged vs autonomous delegation;
- obsolete technology migration;
- abandoned/transferred/sold project;
- no-luck/adversarial/post-2026.

## Soft-lock indicators

- no learning/job/project/recovery action;
- impossible grade evidence/context;
- project has no reachable package/release/archive path;
- debt drag consumes all achievable work indefinitely;
- unresolved critical defect/release gate has no response;
- maintenance load exceeds all capacity without transfer/archive;
- active package depends on missing/unreachable content;
- relationship/health crisis blocks forever;
- Company/OSS/project failure destroys all career paths;
- UI cannot explain stagnation/forecast/risk;
- awarded grade/history lost after update;
- missing mod makes history unreadable.

## Property tests

- no overflow/negative invalid units/stuck MonthRun;
- deterministic seed/order/manifest;
- no duplicate package/release/incident/episode/evidence;
- package state machine valid;
- terminal project/package does not progress;
- known progress monotonic; latent revelation only valid increase;
- latent/defect/release rolls stable on reload;
- release immutable;
- partial not full completion/delivery;
- low confidence != low quality;
- debt drag only affected scope;
- debt repayment cannot increase principal accidentally;
- critical gate blocks unless explicit accepted risk;
- Project provider cannot mutate professional state;
- Product/Company/OSS cannot mutate technical ProjectState directly;
- team/player contribution separated;
- transfer no evidence;
- awarded grade stable;
- failures have reachable recovery unless true ending.

## Golden corpus

- January 1990 two-package project/release;
- uncertainty broadens forecast;
- assisted/independent/partial/failure outcomes;
- debt shortcut and later repayment;
- latent defect → known defect → hotfix;
- bad release → rollback;
- scope cut/release delay;
- team release with small player contribution;
- delegated autonomous/micromanaged package;
- legacy migration;
- abandoned/transferred project;
- Beginner→Senior progression;
- OSS/founder/calm corporate/late career.

## Change gate

Project/progression changes require:

1. baseline report;
2. candidate distribution comparison;
3. exploit/farming comparison;
4. forecast calibration;
5. debt/defect/release comparison;
6. path/recovery assessment;
7. migration/compatibility assessment;
8. explanation of regressions;
9. versioned threshold update if intentional.

## Reports

JSON + Markdown begins with:

- programmer-first verdict;
- Project Engine integrity verdict;
- project exploit/debt/defect/release verdict;
- evidence/grade verdict;
- path parity/soft-lock verdict;
- major distributions/regressions.

## Release gate

- deterministic replay/no overflow/stuck run;
- project/progression invariants;
- no duplicate records;
- vertical slice reachable;
- bounded decision frequency;
- forecast/debt/defect/release policies within targets;
- no dominant project exploit/path;
- recovery scenarios/no-luck corpus pass;
- compatibility/migration corpus passes.
