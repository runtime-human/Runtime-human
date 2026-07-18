# Historical Labor Market Catalog

Связанные документы:

- [ADR-018](../adr/ADR-018-authoritative-programmer-career-employment-model.md);
- [Programmer Career Engine](../game-design/PROGRAMMER-CAREER-ENGINE.md);
- [Programmer Career Content](PROGRAMMER-CAREER-CONTENT.md);
- [Historical Catalog](HISTORICAL-CATALOG.md).

## Цель

Хранить provenance-backed ограничения и свойства рынка труда программистов по эпохе, региону, отрасли и role family. Каталог не задаёт universal world market и не симулирует каждого работодателя/кандидата.

Все работодатели Runtime Human вымышлены. Реальные источники используются только для проверки исторических каналов, практик, технологий и относительных тенденций.

## 1. Принципы

- `global existence` и `local availability` разделены;
- рынок сегментируется по `era + region + industry + role family`;
- title vocabulary и hiring channels меняются по эпохам;
- credential bias, portfolio openness, referral leverage, remote reach и selection patterns не универсальны;
- численные зарплаты/спрос требуют отдельной региональной нормализации;
- отсутствие точного источника обозначается как hypothesis/uncertainty;
- современные источники не ретроактивно описывают 1990-е;
- каталог поставляет content constraints, а не player-facing статистическую энциклопедию.

## 2. Source record

```ts
type HistoricalLaborMarketSource = Readonly<{
  id: HistoricalSourceRef;
  title: string;
  publisher: string;
  url: string;
  publishedOrUpdatedAt?: string;
  accessedAt: string;
  regionScope: readonly RegionId[];
  eraRange: EraRange;
  sourceType: "official-statistics" | "official-framework" | "official-practice" | "primary-company" | "game-analogue" | "secondary";
  supportedClaims: readonly string[];
  limitations: readonly string[];
}>;
```

## 3. Initial source registry

### `source.opm.structured-interviews`

- Publisher: U.S. Office of Personnel Management.
- URL: https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews
- Supports:
  - structured interviews evaluate job-related competencies through consistent questions and standards;
  - behavioral and hypothetical work situations are valid assessment patterns;
  - consistency is an explicit design purpose.
- Runtime Human use:
  - hiring stages should be role-related and explainable;
  - content may reuse one situation pattern across candidates while outcomes remain character/context dependent.
- Limitation:
  - U.S. federal guidance is not a universal historical labor-market rule.

### `source.opm.hiring-assessments`

- Publisher: U.S. Office of Personnel Management.
- URL: https://www.opm.gov/agency-services/talent-management-services/assessment-and-evaluation/hiring-assessments/
- Supports:
  - work simulations and situational judgment can assess realistic job tasks and decisions;
  - different assessment methods measure different competencies.
- Runtime Human use:
  - bounded work sample and situational interview are distinct stage archetypes;
  - assessments should mirror role-relevant work rather than arbitrary trivia.
- Limitation:
  - does not prescribe software-engineering-specific implementation.

### `source.dropbox.career-framework`

- Publisher: Dropbox Engineering.
- URL: https://dropbox.github.io/dbx-career-framework/
- Supports:
  - level expectations distinguish scope, collaborative reach and levers for impact;
  - framework is not a promotion checklist;
  - multiple engineering disciplines and IC/management paths coexist.
- Runtime Human use:
  - separate Professional Grade from title and employer promotion;
  - support multiple high-level career expressions;
  - evaluate sustained scope/impact rather than tenure alone.
- Limitation:
  - one modern company framework, not a universal market taxonomy.

### `source.dropbox.promotion-principles`

- Publisher: Dropbox Engineering.
- URL: https://dropbox.github.io/dbx-career-framework/promotion_principles.html
- Supports:
  - promotion recognizes demonstrated, sustained next-level results;
  - promotion is not a checkbox guarantee.
- Runtime Human use:
  - promotion requires sustained workplace evidence plus organizational availability;
  - no automatic tenure promotion.
- Limitation:
  - company-specific policy and terminology.

### `source.bls.software-development-occupations`

- Publisher: U.S. Bureau of Labor Statistics.
- URL: https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm
- Last modified observed: 2025-08-28.
- Supports:
  - software development, QA/testing and related roles have distinct duties and labor statistics;
  - industry and role family affect work context and compensation;
  - occupational projections are segmented rather than one universal programmer score.
- Runtime Human use:
  - labor-market profiles must segment role family and industry;
  - modern demand cannot be represented by one global `programmerDemand` value.
- Limitation:
  - United States; modern projection; not direct evidence for fictional city or earlier eras.

### `source.gitlab.ai-native-hiring-2026`

- Publisher: GitLab Handbook.
- URL: https://handbook.gitlab.com/handbook/company/working-groups/ai-native-hiring/
- Status observed: proposed working group, start 2026-04-04.
- Supports:
  - at least one major software organization was actively redesigning technical interviews for AI-assisted engineering;
  - judgment, intent, codebase navigation, iteration and validation were explicit target competencies.
- Runtime Human use:
  - 2025–2026+ content may shift interview situations away from mechanical issue spotting toward judgment/verification;
  - AI use must be separated from independent capability and validation.
- Limitation:
  - proposed company initiative, not proof of a completed market-wide transition.

## 4. Era hypotheses

Ниже — design hypotheses. Они не становятся точными региональными параметрами без дополнительных sources.

### 1990–1994 — локальный и институциональный вход

Likely patterns:

- school, club, university, research institute, enterprise and personal-network channels;
- printed/local advertisements;
- limited employer set;
- high value of access to specific hardware/platform;
- employer-specific training more common than public portfolio evaluation;
- remote reach effectively absent for baseline fictional metropolis.

Content implications:

- referral/community/school channels важнее global public vacancy;
- portfolio signal локален и часто демонстрируется лично;
- role titles могут быть `programmer`, `operator-programmer`, `automation specialist`, `trainee` depending on region/content research;
- interview may focus on practical reasoning and existing project demonstration rather than modern standardized process.

### 1995–2001 — web expansion and new firms

Likely patterns:

- growing public internet/job-board presence;
- personal sites/demos become more useful;
- new technology demand and fast responsibility growth;
- higher employer volatility;
- more routes outside traditional institutions.

Content implications:

- public portfolio openness rises;
- small-product archetype appears more often;
- technology gaps can be trainable because demand grows faster than experienced supply;
- stability becomes a stronger offer trade-off.

### 2001–2004 — market correction

Likely patterns:

- lower opportunity volume in affected sectors;
- higher selectivity;
- stronger value of stable enterprise/internal IT;
- cancelled roles and employer-side non-offer increase.

Content implications:

- employer cancellation/budget freeze reason codes become common;
- no-offer must not be misrepresented as candidate regression;
- maintenance/enterprise routes become meaningful alternatives.

### 2005–2010 — formalized web/corporate hiring

Likely patterns:

- job boards and outsourcing/service firms expand;
- multi-stage hiring becomes more common;
- specialization grows;
- financial crisis can affect opportunity volume and layoffs.

Content implications:

- service-contract employer archetype becomes prominent;
- structured technical/manager stages appear;
- market shocks affect company-side outcomes without rewriting capability.

### 2011–2019 — platform, cloud, mobile and public code

Likely patterns:

- public repositories/open-source become stronger signals;
- global collaboration and remote-capable workflows expand;
- specialization and role families increase;
- algorithmic/standardized interviews may appear in some employer archetypes.

Content implications:

- portfolio/community invitation sources expand;
- remote reach changes by employer and region rather than becoming universal;
- interview content may include codebase navigation, design and collaboration.

### 2020–2021 — accelerated remote work

Likely patterns:

- wider geography of opportunities;
- remote onboarding/communication constraints;
- stronger competition beyond local city;
- household/equipment/network access affects eligibility and quality of life.

Content implications:

- remote mode becomes a real offer dimension;
- local low-opportunity characters gain routes, but competition/selectivity may rise;
- onboarding/mentorship uncertainty becomes meaningful.

### 2022–2024 — hiring correction in technology sector

Likely patterns:

- layoffs/restructuring and reduced entry hiring in affected segments;
- stronger selectivity and emphasis on demonstrated contribution;
- employer cancellation and longer search become more visible.

Content implications:

- layoff/re-entry paths required;
- market profile can reduce opportunity volume without lowering grade;
- stable industries may compete with high-growth firms.

### 2025–2026 — AI-assisted engineering transition

Observed primary-source signal:

- GitLab documented a proposed 2026 effort to redesign technical hiring around engineering judgment, intent, codebase navigation, iteration and validation in an AI-assisted environment.

Design implications:

- AI usage is not itself success/failure;
- content distinguishes explanation, generation, delegation, verification and transfer;
- mechanical syntax/trivia assessment loses relative importance in some employers;
- strong employers may evaluate judgment and validation rather than tool avoidance.

Uncertainty:

- transition rate differs by employer/region;
- traditional interview patterns remain valid in many contexts;
- one company initiative is not sufficient for global parameters.

## 5. Market profile authoring

Каждый `LaborMarketProfile` обязан указать:

- era/region/industry/role family;
- source refs;
- which fields are sourced vs inferred;
- uncertainty notes;
- opportunity channels;
- selection patterns;
- credential bias;
- portfolio openness;
- referral leverage;
- trainable-gap tolerance;
- remote reach;
- stability and employer cancellation pressure.

## 6. MVP profile placeholder

`market.metropolis-1990-entry-programming`:

- status: design hypothesis pending dedicated regional research;
- era: January 1990 onward;
- region: fictional metropolis constrained by selected real-world regional model;
- role family: entry programming/automation;
- opportunity volume: low-to-medium;
- public vacancy reach: low;
- school/community/referral leverage: medium-to-high;
- credential bias: employer-dependent;
- portfolio openness: low-to-medium, demonstrated locally;
- trainable-gap tolerance: medium;
- remote reach: none;
- common stages: project demonstration, practical conversation, trial/internship;
- employer cancellation pressure: medium.

До выбора и документирования реального regional baseline этот profile не должен считаться финально сбалансированным.

## 7. Research backlog

До реализации Phase 3 требуется отдельный source pack по выбранному региональному baseline:

- 1990–1995 programmer/automation job channels;
- historical titles and employer types;
- education/credential expectations;
- salary normalization relative to local living costs;
- access to computers and workplace technology;
- internship/trainee practices;
- post-1995 internet/job-board transition;
- 2000/2008/2020/2022 market shocks;
- remote work adoption;
- AI-assisted hiring after 2024.

## 8. Validation gates

- factual market claim without source ref fails review;
- source outside its region/era cannot directly set parameter;
- fictional employer cannot be presented as historical fact;
- modern title/interview channel cannot appear in 1990 content without justification;
- market shock cannot reduce mastery/grade;
- profile cannot hard-lock all first-job routes;
- uncertainty must be explicit where evidence is weak;
- source update requires impact review for content fingerprints and balance fixtures.
