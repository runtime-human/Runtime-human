# Technology & Ecosystem Balance

Нормативные источники:

- [ADR-019](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [Technology Ecosystem Engine](../game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md)
- [Technology Ecosystem UI](../ui/TECHNOLOGY-ECOSYSTEM-UI.md)
- [Balance Simulation](BALANCE-SIMULATION.md)

## Цель

Проверять, что technology context создаёт понятные профессиональные компромиссы и историческую эволюцию, а не dominant latest-tech path, энциклопедический grind или скрытую таблицу «правильных языков».

## Primary questions

1. Понимает ли игрок преимущество и ограничение текущего context?
2. Существуют ли минимум два жизнеспособных technology paths?
3. Не доминирует ли новая/mainstream технология?
4. Сохраняет ли legacy осмысленную нишу без permanent trap?
5. Разделяет ли игрок access, familiarity, ecosystem и demand?
6. Объясняется ли provider outcome причинно?
7. Сохраняются ли context/history после reload/catalog update?

## Metrics

### Comprehension

- `technology_context_understood_rate`;
- `advantage_constraint_recall_rate`;
- `newer_not_always_better_rate`;
- `global_vs_local_access_distinction_rate`;
- `familiarity_vs_market_demand_distinction_rate`;
- `support_vs_adoption_distinction_rate`.

Starting hypotheses:

- ≥80% correctly name current goal/context;
- majority name one advantage and one constraint without Details;
- ordinary choice understood in 10–20 seconds;
- majority explain two causal factors after outcome.

### Choice diversity

- option selection distribution;
- stable/familiar selection rate;
- emerging selection rate;
- mainstream selection rate;
- legacy continuation rate;
- migration selection rate;
- abandon/defer rate.

No option should dominate across unrelated fixtures.

### Access equity

- time to first meaningful use by background;
- low-access fallback success;
- school/shared route viability;
- income/equipment advantage;
- permanent technology soft-lock rate;
- fallback abandonment rate.

Wealth may change convenience and speed, not capability ceiling.

### Progression integrity

- familiarity gain by actual target practice;
- transfer efficiency;
- migration/reacquisition time;
- easy technology switching farming;
- passive availability familiarity inflation;
- assisted vs independent technology use;
- production evidence validity.

### Historical/catalog quality

- source coverage;
- primary-source coverage for release/support facts;
- estimated-field ratio;
- triangulated mainstream claims;
- chronology violations;
- impossible prerequisite/compatibility edges;
- catalog update compatibility failures.

### UI complexity

- visible trait count;
- exact-version exposure rate;
- Details-open requirement rate;
- terminology errors;
- tech-tree navigation dependence;
- long-RU overflow/a11y failures.

## Dominance tests

Technology option A weakly dominates B in a fixture when A is no worse in all current relevant outcomes and strictly better in at least one, with no access/cost/future trade-off.

Relevant dimensions may include:

- current delivery;
- learning novelty;
- quality/risk;
- compatibility;
- support burden;
- market opportunity;
- access/cost;
- maintenance;
- future migration burden.

Fixture is rejected when an option weakly dominates another without explicit narrative purpose.

## Critical anti-patterns

### Newest-tech dominance

Fail when the newest available band is optimal for most projects, learning and jobs regardless of familiarity/access/context.

Counter-pressure:

- learning/context-switch cost;
- sparse tooling;
- compatibility;
- limited local access;
- uncertainty;
- project fit;
- market timing.

### Mainstream dominance

Fail when broad ecosystem + demand always beats niche/emerging/legacy.

Mainstream can carry:

- complexity/dependency burden;
- competition;
- weak fit;
- migration churn;
- fragmented versions;
- institutional constraints.

### Legacy trap

Fail when choosing legacy permanently blocks growth or when leaving legacy is always correct immediately.

Legacy should offer:

- installed-base work;
- familiar delivery;
- niche expertise;
- maintenance/recovery opportunities;

with real:

- support risk;
- shrinking new-project reach;
- migration burden;
- learning-source constraints.

### Ecosystem size equals quality

Fail when component/library breadth directly improves every project dimension.

Large ecosystem can introduce dependency, verification, fragmentation and maintenance risks.

### Access/wealth dominance

Fail when buying current hardware unlocks strictly superior long-term path without viable shared/institution/employer route.

### Version micromanagement

Fail when player must compare patch/minor releases or maintain package graph.

### Migration farming

Fail when repeatedly migrating between bands grants strong novelty/familiarity/evidence without meaningful outcome.

### Transfer farming

Fail when family switching creates target familiarity/evidence without target practice.

### Popularity monoculture

Fail when one survey/repository metric determines adoption, ecosystem and market demand simultaneously.

## Required deterministic fixtures

### A. 1990 familiar BASIC-like context

- school/shared PC access;
- established local material;
- limited component/tooling breadth;
- low immediate learning barrier;
- small project fit.

Expected: viable, understandable baseline.

### B. Globally available, locally unavailable

Expected:

- cannot select direct use;
- visible reason;
- at least one future/fallback route;
- no familiarity gain.

### C. Shared access versus home access

Shared route:

- less capacity/flexibility;
- possible mentor/peer feedback;
- same long-term capability ceiling.

### D. Emerging alternative

- better structural/project potential;
- higher learning/access/tooling uncertainty;
- no universal superiority.

### E. Mainstream broad ecosystem

- strong docs/components/help;
- dependency/complexity burden;
- context-specific benefit.

### F. Legacy-critical unsupported band

- real maintenance/job value;
- support/security/modernization risk;
- migration route exists.

### G. Version migration

- current project compatible with old band;
- target gives future support;
- migration consumes meaningful work and risk;
- no instant familiarity/evidence.

### H. Wrong project fit

Popular technology has broad ecosystem but poor project/platform fit. Niche technology is viable.

### I. Career demand mismatch

Character familiar with old band; opportunity uses newer band but trainable gap. Grade unchanged.

### J. Catalog update after committed release

Past release/history remains unchanged; current projection may change.

### K. Active draft fingerprint mismatch

Exact resume blocked; controlled recovery offered; no reroll.

### L. AI generation without verification

Delivery may accelerate, but autonomy/quality/evidence limited until verification.

## Property tests

- global release precedes local availability;
- local availability precedes practical direct access unless indirect route;
- unsupported does not imply zero installed-base demand;
- mainstream does not imply active support for every band;
- familiarity never changes from catalog projection alone;
- transfer requires target exposure;
- project outcome is not calculated by Technology Engine;
- career outcome is not calculated by Technology Engine;
- no exact version is required unless mapped to meaningful band;
- context materialization is deterministic;
- duplicate resume/answer creates no second outcome;
- committed semantic snapshot is immutable;
- missing historical-only content uses tombstone;
- low-access fixture has reachable meaningful route;
- normal card has no more than five traits.

## Scenario matrix

Cross:

- era: 1990 / 2000s / 2010s / 2020s;
- access: home / school/shared / employer / unavailable;
- lifecycle: emerging / mainstream / declining / legacy-critical;
- support: active / maintenance / unsupported;
- ecosystem: sparse / broad / fragmented;
- familiarity: none / beginner / current / stale;
- provider: learning / project / career;
- outcome: clean / compromise / partial / recovery.

Not every combination needs authored content. Matrix identifies missing/high-risk coverage.

## Historical data gates

### Direct chronology

Release, standard publication and support dates require primary/official source where available.

### Adoption/ecosystem

A canonical broad/mainstream claim requires:

- two independent source classes; or
- explicit `estimated` status;
- recorded scope/period/method limitations.

### Local adaptation

Must state fictional basis and cannot pretend to represent a real country/city.

### Future

After historical-through boundary, real products do not receive invented releases or support changes. Future waves use fictional IDs/rules.

## Playtest tests

Ask player:

1. What can you use now?
2. Why is it available or unavailable?
3. What does this technology help with?
4. What is its current constraint?
5. Why might an older or less popular option still be reasonable?
6. What changed after your choice?

Failure if correct answer requires Details/internal terms.

## Balance levers

Allowed:

- access capacity/cost bands;
- learning novelty and context-switch burden;
- tooling/examples/feedback affordances;
- compatibility/support/maintenance risk;
- project fit;
- demand/installed-base context;
- migration work;
- deterministic uncertainty.

Avoid:

- hidden universal multipliers;
- arbitrary technology nerfs;
- exact popularity percentages;
- forced obsolescence timers;
- patch-level balance;
- dynamic web-driven values.

## Telemetry/event schema

Offline playtest logs may record:

- fixture/context IDs;
- visible traits;
- selected approach;
- choice time;
- provider outcome class;
- reason codes;
- fallback usage;
- Details opened;
- comprehension answers;
- reload/resume path.

Do not log personal external data or raw free text by default.

## Exit gates for MVP Casual

- 1990 context understood without tutorial;
- stable and alternative path both selected by meaningful share;
- newest/mainstream not dominant;
- low-access fallback reaches project;
- player distinguishes technology from skill;
- player distinguishes availability from familiarity;
- result causality understood;
- no version/package micromanagement;
- reload/catalog fixtures deterministic;
- Normal UI sufficient.

## Deferred

- exact ecosystem population model;
- package dependency graph;
- live popularity/download data;
- multiple regional markets;
- organization-wide tool procurement;
- open-source maintainer network health;
- vulnerability feed;
- detailed hardware benchmarks;
- AI benchmark leaderboard;
- simulation of every historical technology.

## Definition of Done

Balance work is ready when declared fixtures and properties are versioned, no dominant universal path exists, low-access recovery is proven, source scope is explicit, committed-history compatibility is tested and playtest evidence shows a technology choice is causal and understandable rather than encyclopedic.