---
title: "Historical Technology Catalog"
type: content
status: draft
canon: true
depends_on: [ADR-019]
updated: 2026-07-18
---

# Historical Technology Catalog

Связанные документы:

- [ADR-019](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [Technology Ecosystem Engine](../game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md)
- [Historical Catalog](HISTORICAL-CATALOG.md)
- [Technology Ecosystem Content](TECHNOLOGY-ECOSYSTEM-CONTENT.md)

## Цель

Хранить source-backed global chronology, major version bands, platform/toolchain prerequisites, compatibility and support lifecycle технологий. Каталог не симулирует fictional local diffusion, practical character access или universal popularity.

## Ownership

Catalog owns:

- factual identity/category;
- public release chronology;
- standards publication;
- gameplay-relevant version bands;
- platform/runtime prerequisites;
- compatibility/migration relations;
- official support lifecycle;
- scoped ecosystem/adoption evidence;
- source refs, precision, confidence and limitations.

Catalog does not own:

- fictional city availability;
- equipment or installed state;
- character familiarity;
- project/career outcomes;
- local demand probability;
- company or community state.

## Historical-through boundary

```text
historicalThrough = 2026-07
```

After this boundary:

- no invented releases/support policies for real products;
- no invented company/platform events;
- future technologies use fictional IDs;
- future rules use separate `futureRulesVersion`.

## Source record

```ts
type HistoricalTechnologySource = Readonly<{
  id: SourceRefId;
  sourceClass:
    | 'official-project'
    | 'vendor-policy'
    | 'standards-body'
    | 'official-history'
    | 'developer-survey'
    | 'repository-platform'
    | 'package-ecosystem-study'
    | 'labor-market-data'
    | 'expert-radar'
    | 'academic-study'
    | 'historical-secondary';
  title: string;
  publisher: string;
  publishedAt?: HistoricalDate;
  observedPeriod?: HistoricalDateRange;
  url: string;
  geography?: string;
  population?: string;
  methodology?: string;
  supportedClaims: readonly HistoricalClaimKind[];
  limitations: readonly string[];
  reviewedAt: GameDate;
}>;
```

## Source authority by claim

| Claim | Preferred evidence |
|---|---|
| First public release | official project/vendor history |
| Standard publication | standards body |
| Support/EOL | official support policy |
| Compatibility | official docs/specification |
| Repository activity | repository platform statistics |
| Developer use/preferences | scoped developer survey |
| Package ecosystem risk | package study/academic research |
| Labor demand | scoped labor/job data |
| Expert recommendation | expert radar with context |
| Historical local adoption | regional historical sources or explicit fictional estimate |

Expert recommendation cannot prove popularity. Repository activity cannot prove global professional usage. Survey preference cannot prove production suitability.

## Claim confidence

```ts
type SourceConfidence =
  | 'primary-confirmed'
  | 'multi-source-supported'
  | 'secondary-supported'
  | 'estimated'
  | 'hypothesis';
```

`mainstream`, `broad ecosystem` or similar composite claims require:

- at least two independent source classes; or
- `estimated/hypothesis` status;
- explicit observed period and scope.

## Historical date precision

```ts
type HistoricalDate = Readonly<{
  value: string;
  precision: 'day' | 'month' | 'quarter' | 'year';
}>;
```

A year-only source must not be converted to a fictional exact date.

## Technology record

```ts
type HistoricalTechnologyRecord = Readonly<{
  id: HistoricalEntityId;
  technologyId: TechnologyId;
  category: TechnologyCategory;
  familyId: TechnologyFamilyId;
  announcedAt?: HistoricalDate;
  firstPublicReleaseAt: HistoricalDate;
  prerequisites: readonly HistoricalPrerequisite[];
  versionBands: readonly HistoricalTechnologyVersionBand[];
  milestones: readonly HistoricalTechnologyMilestone[];
  sourceRefs: readonly SourceRefId[];
  confidence: SourceConfidence;
}>;
```

## Version band record

```ts
type HistoricalTechnologyVersionBand = Readonly<{
  id: TechnologyVersionBandId;
  availableFrom: HistoricalDate;
  meaningfulChanges: readonly VersionBandChangeKind[];
  platformRequirements: readonly HistoricalEntityId[];
  compatibilityProfileId: CompatibilityProfileId;
  supportProfile: HistoricalSupportProfile;
  ecosystemEvidenceRefs: readonly SourceRefId[];
  migrationEdges: readonly HistoricalMigrationEdge[];
  confidence: SourceConfidence;
}>;
```

Band needs at least two gameplay-relevant change kinds unless an explicit compatibility/support break alone creates a mandatory player decision.

## Support profile

```ts
type HistoricalSupportProfile = Readonly<{
  activeFrom: HistoricalDate;
  maintenanceFrom?: HistoricalDate;
  securityOnlyFrom?: HistoricalDate;
  endOfSupportAt?: HistoricalDate;
  policyKind:
    | 'fixed-lifecycle'
    | 'rolling-current'
    | 'community-maintained'
    | 'vendor-discretion'
    | 'historical-unknown';
  sourceRefs: readonly SourceRefId[];
}>;
```

Support policy is separate from adoption and installed base.

## Ecosystem evidence

```ts
type EcosystemEvidence = Readonly<{
  technologyId: TechnologyId;
  versionBandId?: TechnologyVersionBandId;
  observedPeriod: HistoricalDateRange;
  dimension:
    | 'tooling'
    | 'documentation'
    | 'learning-sources'
    | 'component-breadth'
    | 'testing-support'
    | 'delivery-support'
    | 'interoperability'
    | 'community-feedback'
    | 'maintenance-channels';
  observation: HistoricalObservationBand;
  sourceRefs: readonly SourceRefId[];
  confidence: SourceConfidence;
  limitations: readonly string[];
}>;
```

Runtime profiles are compiled from evidence plus explicit design assumptions; raw metrics do not directly enter save calculations.

## Adoption evidence

```ts
type AdoptionEvidence = Readonly<{
  technologyId: TechnologyId;
  observedPeriod: HistoricalDateRange;
  scope: AdoptionScope;
  signalKind:
    | 'repository-activity'
    | 'survey-use'
    | 'survey-interest'
    | 'package-activity'
    | 'job-demand'
    | 'expert-recommendation'
    | 'installed-base';
  band: HistoricalObservationBand;
  sourceRefs: readonly SourceRefId[];
  limitations: readonly string[];
}>;
```

Different signal kinds never merge into one universal popularity number.

## Local adaptation handoff

Historical catalog provides constraints:

```text
global availability
+ prerequisites/platform
+ observed ecosystem/adoption bands
+ support status
```

City/Era content creates:

```text
fictional local diffusion
+ institutions/channels
+ cost/rarity
+ era-valid project/career contexts
```

Practical access is resolved from character state at runtime.

## Seed chronology evidence

The following facts are research anchors, not the full playable catalog.

### IBM PC/MS-DOS programming environment

Official Microsoft history records the 1981 IBM PC launch with MS-DOS 1.0 and Microsoft language products including BASIC, COBOL and Pascal. It supports global chronology for an early PC programming context, not immediate availability in the fictional city.

Source:

- `source.microsoft-history-1981-pc-dos-languages`
- https://learn.microsoft.com/en-us/shows/history/history-of-microsoft-1981

### QuickBASIC/GW-BASIC before game start

Official Microsoft history records QuickBASIC 2.0 and GW-BASIC 3.2 in 1986. This supports a BASIC-family context being globally established before January 1990.

Source:

- `source.microsoft-history-1986-quickbasic`
- https://learn.microsoft.com/en-us/shows/history/history-of-microsoft-1986

### Python early releases

Official Python documentation records early releases beginning with Python 0.9.0 in 1991 and subsequent 1.x releases. Python is therefore not eligible in the January 1990 starting context.

Source:

- `source.python-official-early-releases`
- https://docs.python.org/3/license.html#history-and-license

### ECMAScript standardization

Ecma International records the first edition of ECMA-262 in June 1997. Historical content must distinguish JavaScript implementation history from formal ECMAScript standard publication.

Sources:

- `source.ecma-262-first-edition`
- https://ecma-international.org/publications-and-standards/standards/ecma-262/
- https://ecma-international.org/ecma-262/1.0/

### Git

Official Git history explains that Git was created in 2005 after the Linux kernel community’s BitKeeper relationship ended. Git cannot appear as a 1990s tool.

Source:

- `source.git-official-history`
- https://git-scm.com/book/en/v2/Getting-Started-A-Short-History-of-Git

### Docker

Docker’s official history places the public demonstration and introduction of Docker in 2013. The date supports global chronology; ecosystem maturity requires later and separate evidence.

Sources:

- `source.docker-official-2013-demo`
- https://www.docker.com/blog/docker-celebrates-10-years/
- https://www.docker.com/company/

### Kubernetes

Official Kubernetes sources place the first commit/public release in 2014 and version 1.0 in 2015. Release, 1.0 maturity and later adoption/support are separate facts.

Sources:

- `source.kubernetes-first-commit`
- https://kubernetes.io/blog/2024/06/06/10-years-of-kubernetes/
- `source.kubernetes-1-0`
- https://kubernetes.io/blog/2015/07/15/kubernetes-v1-0-release/

## Support-policy examples

### .NET

Microsoft’s official support policy distinguishes LTS and STS releases with published support dates. This supports support-profile semantics, not universal market demand.

Source:

- `source.dotnet-official-support-policy`
- https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core

### Python

Python’s official status pages define maintained release lines and support phases. Use exact current source snapshots when authoring a version band.

Source:

- `source.python-official-status`
- https://devguide.python.org/versions/

### Kubernetes

Official release/support documentation describes maintained release branches and patch-support windows. Use it for support status only.

Source:

- `source.kubernetes-release-support`
- https://kubernetes.io/releases/

## Adoption/ecosystem source examples

### GitHub Octoverse

GitHub’s Octoverse reports activity on GitHub and must remain scoped to that platform. It can support repository-activity trends, not universal language ranking.

Source:

- `source.github-octoverse-2025`
- https://github.blog/news-insights/octoverse/octoverse-2025/

### Stack Overflow Developer Survey

The survey reports its respondent population, usage and desired/admired measures. These signals remain distinct and sample-scoped.

Source:

- `source.stack-overflow-survey-2025`
- https://survey.stackoverflow.co/2025/technology/

### JetBrains State of Developer Ecosystem

The report is a large developer survey but reflects its methodology and audience. It is corroborating evidence, not universal truth.

Source:

- `source.jetbrains-ecosystem-2025`
- https://www.jetbrains.com/lp/devecosystem-2025/

### Thoughtworks Technology Radar

Radar rings represent opinionated recommendations based on observed project/client experience. They can inform maturity/risk hypotheses but do not measure popularity.

Source:

- `source.thoughtworks-technology-radar`
- https://www.thoughtworks.com/radar

## Ecosystem-health evidence policy

Software ecosystem health is multi-dimensional. Academic/package studies may inform:

- maintainer concentration;
- dependency concentration;
- update lag;
- abandonment risk;
- technical/community/business dimensions.

They cannot produce one global health score in Runtime Human.

Example source classes:

- software ecosystem health literature;
- npm/PyPI/Cargo dependency studies;
- package maintenance/security studies.

Each compiled band records what was observed and what was inferred.

## 1990 seed profile constraints

For MVP Casual:

```text
technology family: BASIC-like
platform: PC/DOS-like
version bands: one aggregate playable band
tooling: aggregate editor/interpreter/compiler
sources: official pre-1990 PC/BASIC chronology
local diffusion: fictional/estimated
access routes: home or school/shared
```

Do not create exact city adoption percentages or claim a specific real country.

## Chronology validation

Compiler rejects:

- version before technology release;
- tool before required platform/runtime;
- local availability before global availability;
- learning source before its distribution channel;
- project/career use before local/role eligibility;
- support phase ordered before active release;
- migration target before target availability;
- AI tool before allowed historical era.

## Compatibility validation

- referenced bands/profiles exist;
- migration edge is directionally valid;
- hard prerequisite graph is acyclic or explicitly bootstrapped;
- old historical snapshots retain tombstone mapping;
- active content has exact-compatible or controlled recovery path.

## Review checklist

For every new Tier A technology:

1. Why does it create current gameplay?
2. Is category/family correct?
3. Which source proves first public release?
4. Which bands are truly meaningful?
5. Are support and adoption separate?
6. Which ecosystem observations are sourced versus inferred?
7. Is local diffusion explicitly fictional?
8. Does practical access have fallback?
9. What project/learning/career decision uses it?
10. What compatibility/migration fixtures are required?
11. How are old saves/history preserved?
12. Is Normal UI bounded?

## Forbidden

- dates without source/precision;
- modern popularity projected backward;
- one survey as universal ranking;
- expert recommendation treated as adoption;
- every library/package as technology;
- fictional local data presented as fact;
- dynamic internet values in authoritative simulation;
- invented post-2026 releases for real products;
- catalog updates rewriting committed history.