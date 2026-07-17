# Компания и tycoon-часть

Связанные спецификации:

- [Project & Work Package Engine](PROJECT-WORK-PACKAGE-ENGINE.md);
- [Professional Progression Engine](PROFESSIONAL-PROGRESSION-ENGINE.md).

## Когда открывается

Компания становится доступна после достаточной professional/product/financial base. Founder/CTO path не обязан быть лучшим endgame.

## Company ownership

Company domain владеет:

- company profile/ownership;
- employees/teams;
- hiring/payroll/retention;
- cash/runway/operating costs;
- portfolio priorities;
- budgets/tooling/process policies;
- contracts/client relations;
- strategy/reputation;
- organizational debt;
- organization-level delegation and succession.

Company не владеет duplicate technical ProjectState.

Technical projects use shared Project Engine for:

- scope/Work Packages;
- quality/debt/defects;
- releases/maintenance;
- participant contribution;
- technical outcomes.

## Project interface

Company provides:

```text
team/participant capacity
ownership
portfolio priority
budget/tooling/process support
stakeholder/deadline/client constraints
quality/release policies
organizational context
```

Project Engine returns:

```text
delivery/forecast
technical risk
quality/debt/defect state
release/maintenance outcomes
participant contribution
ExperienceEpisode candidates
```

Company cannot directly set package progress, quality or release success.

## Strategic decisions

- hire/fire/promote/retain;
- create/merge/close teams;
- appoint project owners/leads;
- set portfolio priority and budgets;
- invest in tooling/infrastructure/process;
- launch/stop/transfer products/projects;
- set quality/release guardrails;
- accept clients/funding;
- manage runway;
- delegate ownership;
- succession/temporary absence.

The player does not assign each employee hour/task.

## Teams and capacity

Employee has grade/role/skills profile, motivation, salary expectations, relationships and retention risk. Background workforce may be aggregated.

Company produces `ParticipantCapacityProfile`; Project Engine calculates project-specific capability/coordination/continuity.

Headcount is not a linear work multiplier. Effects depend on:

- ownership clarity;
- coupling/dependencies;
- team familiarity;
- review/communication latency;
- process/tool support;
- simultaneous portfolio load.

## Delegation

Company-level policy selects:

- owner/team;
- expected outcome;
- autonomy;
- budget/time envelope;
- quality guardrails;
- review cadence;
- escalation threshold.

Project Engine stores the package-specific participant/delegation plan.

Micromanagement may reduce autonomy/motivation and increase coordination. Absent oversight may increase latent risk with weak owner/clarity.

Founder/CTO receives leverage/leadership evidence only from traceable decisions/outcomes, not all company work.

## Portfolio

Company portfolio projection compares:

- strategic value;
- expected cash impact;
- technical health;
- maintenance burden;
- key-person risk;
- opportunity cost;
- project dependencies.

Portfolio does not merge all projects into one progress score.

Player normally manages portfolio priorities and exceptions, not every Work Package.

## Organizational debt vs technical debt

Organizational debt belongs Company:

- unclear ownership;
- overloaded approval/review;
- knowledge silos;
- hiring/process gaps;
- coordination structure.

Technical debt belongs Project Engine.

Organizational debt can provide coordination/continuity constraints but cannot directly create/delete technical debt records.

## Finance

Authoritative company finance:

- cash;
- recurring revenue;
- payroll;
- infrastructure/rent;
- abstracted city taxes/legal costs;
- debt/one-time expenses.

All integer minor units.

Revenue/product success does not change technical quality or player mastery automatically.

## Failure and recovery

- cash crisis;
- failed release;
- incident;
- key employee loss;
- portfolio overload;
- client loss;
- fictional legal dispute;
- acquisition/merger;
- controlled shutdown.

Company bankruptcy does not necessarily end character life/career. Technical assets/projects may transfer, sell, open-source or archive.

## UI abstraction

Novice view:

- runway;
- team/owner summary;
- portfolio priorities;
- critical project risks;
- pending strategic decisions.

Advanced view:

- capacity/coordination;
- maintenance/technical health projections;
- ownership/delegation;
- portfolio dependencies;
- contribution trace.

No office grid, employee-hour allocation or Jira dashboard.

## Invariants

- Company does not duplicate/mutate Project technical state directly;
- project owner/team refs valid;
- budget/capacity cannot be negative;
- portfolio priority does not create work units from nothing;
- delegated team outcome is not player direct-craft contribution;
- organizational debt distinct from technical debt;
- company/project/progression outcomes commit atomically in MonthRun;
- employees are not interchangeable linear multipliers;
- terminal company/project relationships preserve history/tombstones.

## Tests

- company capacity → project input;
- portfolio priority/allocation;
- owner/delegation policy;
- coordination/micromanagement effects;
- team result vs player contribution;
- technical vs organizational debt;
- company/project atomic commit;
- key employee departure/recovery;
- portfolio overload;
- bankruptcy/project transfer;
- no direct company mutation of project quality/skills.

## Не моделируется

- офис по клеткам;
- столы/комнаты;
- employee daily tasks/hours;
- multiple countries/branches with full law/tax;
- real accounting/legal simulation;
- company as universal best endgame.
