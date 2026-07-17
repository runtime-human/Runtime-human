# Карьерная система

Связанные спецификации:

- [Programmer-First Design](PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression Engine](PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](PROJECT-WORK-PACKAGE-ENGINE.md).

## Цель

Career domain turns professional capability into jobs, constraints, income, organizational consequences and new paths.

Work provides project/task contexts but does not grant mastery for tenure.

## Boundary

Career owns:

- vacancy/job/employment lifecycle;
- position/title/company level;
- contract/salary/schedule/remote mode;
- role expectations;
- stakeholders/deadlines;
- promotion/firing/layoff;
- interviews/negotiation;
- organizational evaluation/politics;
- career history/reputation consequences.

Career does not own:

- Project technical scope/quality/debt/defects/releases;
- Company teams/payroll/portfolio state beyond typed refs/signals;
- professional mastery/evidence/grade truth.

## Work as persistent commitment

After employment, work automatically:

- occupies calendar/capacity;
- pays salary;
- links character to employer projects;
- supplies role expectations, constraints and participant context;
- receives project contribution/outcome summaries;
- affects organizational performance/promotion/firing risk;
- creates Career-specific episodes when organizational/interview/leadership outcome exists.

Player does not press “work” each month.

## Job definition

Vacancy defines:

- employer/company archetype;
- position/title/company level and expected grade/readiness;
- compensation/schedule/remote policy;
- technology/project domains;
- interview stages;
- culture/process/tooling;
- stakeholder/deadline profile;
- typical project archetypes/package challenge distribution;
- quality/release policy;
- mentorship/feedback/autonomy;
- stability/workload/growth;
- legacy/innovation balance.

It does not embed separate technical project simulation.

## Job market

Normal search presents:

- 3–7 relevant offers;
- 1–3 strong comparison candidates;
- extended search on request.

Generated from era/city market, company needs, roles, technologies, salary bands, network/reputation and search strategy.

## Hiring and interview

Search/apply are management actions. Preparation/tests/interviews/negotiation may consume calendar time.

Outcome uses:

- demonstrated/current-market readiness;
- relevant evidence/technologies;
- interview preparation/communication;
- reputation/network;
- company fit;
- bounded deterministic randomness.

No fully random rejection. UI shows reason categories/uncertainty, not exact formula.

Interview assignment may use a temporary provider/project challenge but must not mint production evidence unless it produces a real eligible outcome under policy.

Key rolls are stable across reload.

## Career → Project contract

Career provides:

```text
employment/project refs
role expectations
stakeholders/client context
deadline and priority constraints
required quality/release policy
autonomy/ownership expectation
available mentorship/review
organizational tooling/process signal
```

Project Engine returns:

```text
package/release outcome
forecast/deadline result
quality/debt/defect/incident summary
character/team contribution
ownership/reliability summary
```

Career cannot directly set package progress/quality/release success.

## Work package creation

Career/Employment may submit typed `ProjectWorkRequest`:

- desired outcome/value;
- project/scope context;
- deadline/priority;
- stakeholder constraints;
- expected responsibility/autonomy;
- organizational quality policy.

Project Engine validates and creates/updates Work Packages. Career does not create arbitrary technical truth.

## Workplace events

Examples:

- ambiguous requirement;
- difficult package;
- critical defect/incident;
- review conflict;
- architecture/technology trade-off;
- debt/legacy pressure;
- deadline/scope conflict;
- ownership change;
- manager/team change;
- promotion/layoff;
- mentoring/review opportunity;
- public team success.

Technical choices route through Project Engine. Organizational choices remain Career/Event.

## Grade, title and project contribution

- `ProfessionalGradeAward` is global professional milestone;
- position/title/company level belong employer;
- project contribution is technical record;
- promotion is organizational decision.

Possible:

- Middle in Junior-position;
- inflated title without capability;
- Senior IC;
- Team Lead/Tech Lead/Architect roles;
- CTO/Founder;
- strong open-source maintainer without corporate title;
- return management → IC.

## Promotion review

Inputs:

- awarded/readiness profile;
- relevant project contribution/outcomes;
- delivery reliability/quality/ownership;
- collaboration/leadership;
- stakeholder/relationship/politics;
- available role/budget/company state;
- employer policy.

One team release or revenue spike does not automatically promote character. Contribution and sustained contexts matter.

## Target progression

Starting hypotheses:

- Intern → Junior: 6–18 months supervised work;
- Junior → Middle: 24–48 months;
- Middle → Senior: 36–72 months.

Validated across company archetypes/specializations/backgrounds/interruptions.

## Senior paths

- deep expert/Top Programmer candidate;
- Tech Lead/Architect;
- Team Lead/management;
- CTO/Founder;
- open-source maintainer;
- public expert;
- freelance/consulting;
- rare specialization.

Founder/CTO not mandatory best path. Reduced direct coding shifts contribution toward architecture/review/mentoring/delegation, not automatic mastery.

## Career path parity

Compare mastery, autonomy, income, stability, reputation, fame, freedom, influence, workload, risk and legacy.

Different rewards, viable independent fantasies/endgames.

## Employers

Fictional companies evolve by era: stack/process/projects, growth, merger/crisis/closure.

Stack/process change alters Project inputs and market readiness, not historical mastery/evidence.

## Job loss and recovery

Loss creates financial/career pressure but not instant fail.

Recovery:

- job search/support/freelance;
- retraining/project portfolio;
- network/referrals;
- lower-level re-entry without mastery reset;
- legacy/maintenance niche;
- own/open-source project;
- debt restructuring;
- reacquisition after break.

Break reduces fluency/current-market readiness, not awarded grade automatically.

## Invariants

- Career does not duplicate/mutate Project technical state;
- Career does not mutate professional grade/mastery directly;
- salary/title/fame not technical evidence;
- job tenure alone gives no mastery;
- promotion uses contribution/evidence but remains employer decision;
- employer work request validated by Project Engine;
- team outcome separated from character contribution;
- deterministic interview/organizational rolls stable;
- employment/project/progression consequences commit atomically;
- fired character receives no salary;
- unavailable-era role/technology/project not generated.

## Tests

- job request → Project package;
- project contribution → career review;
- title vs grade mismatch;
- team release vs player contribution;
- deadline/quality conflict;
- promotion/layoff determinism;
- interview save-scumming resistance;
- job loss/re-entry;
- management → IC;
- no tenure/salary → mastery;
- Career/Project/Progression atomic commit.
