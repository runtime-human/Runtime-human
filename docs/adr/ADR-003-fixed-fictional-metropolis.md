# ADR-003: Fixed Fictional Metropolis and Compressed Geography

- Status: Accepted
- Date: 2026-07-16

## Context

The game simulates the life and career of a programmer from January 1990 onward. Supporting multiple real countries or cities would multiply the amount of required content: tax systems, salaries, education, housing, companies, conferences, currencies, local crises, relocation, visas, and regional historical timelines.

The setting must preserve the historical evolution of the software industry without turning the project into a geopolitical, legal, or migration simulator.

## Decision

The entire core game takes place in one fixed fictional international metropolis located in an unnamed fictional country.

The city is a compressed metropolitan setting rather than a geographic simulation. The player does not select a country or city and does not permanently relocate during the core campaign.

### Real layer

The following may use real names and historically sourced dates:

- programming languages;
- frameworks and runtimes;
- open-source technologies;
- software-development standards;
- major neutral milestones in computing and the software industry.

### Fictional layer

The following remain fictional:

- the city and country;
- employers and clients;
- universities and schools;
- shops and hardware sellers;
- conferences and professional communities;
- local products, startups, investors, and media;
- NPCs;
- salary, tax, housing, and education profiles.

Commercial companies and products may be mentioned only in neutral historical context when essential. Their logos, branding, endorsement, internal events, and fictional scandals are not used.

### Compressed geography

The game does not implement:

- a world map;
- selectable countries;
- permanent relocation;
- visas or immigration systems;
- separate regional tax and legal models;
- detailed districts, roads, commute routes, or transport simulation.

Temporary travel may appear as an event, for example attending a foreign conference, visiting a client, or joining a hackathon. Travel has costs and consequences but does not create another fully simulated location.

### City evolution

The city changes through historical eras:

1. 1990–1994: home computers, computer clubs, magazines, small software shops;
2. 1995–2001: public internet, web studios, ISPs, dot-com growth;
3. 2002–2006: market recovery, outsourcing, Web 2.0, professional communities;
4. 2007–2012: mobile development, SaaS, cloud adoption, startup growth;
5. 2013–2019: DevOps, containers, mature open source, remote collaboration;
6. 2020–2026: remote work, generative AI, coding assistants, agentic development;
7. after July 2026: explicitly fictional alternative technological future.

These eras alter available jobs, organizations, products, housing, equipment, events, and market demand without requiring new geographic regions.

## Architectural Consequences

Replace a multi-region model with:

- `HomeCityProfile`;
- `WorldTimeline`;
- `EraProfile`;
- `LocalMarketState`;
- `GlobalTechnologyCatalog`.

Do not create a general-purpose `CountrySimulation`, `VisaSystem`, `RelocationSystem`, or `RegionalTaxEngine` in the core architecture.

A location reference is contextual rather than geographic:

- home;
- school or university;
- employer office;
- coworking space;
- conference venue;
- shop;
- hospital;
- temporary travel destination.

## Rationale

This model preserves the strongest gameplay value—career decisions, skills, projects, technology waves, open source, housing, equipment, relationships, and entrepreneurship—while preventing geographic scope from multiplying the content burden.

It follows the useful pattern seen in management and life simulations that compress geography into a small number of meaningful spaces while allowing a broader historical or cultural timeline to influence gameplay.

## Rejected Alternatives

### Multiple real countries and cities

Rejected because each additional region requires a distinct economy, institutions, history, and content matrix while most players experience only one path per playthrough.

### One real city

Rejected because it would require accurate local political, economic, monetary, educational, and labor history from 1990 onward and would constrain fictional employers and events.

### No setting at all

Rejected because housing, shops, offices, conferences, family life, and the visible growth of the local software ecosystem need a coherent place.

### Fictional city-state with detailed politics

Rejected because the political and legal simulation would add complexity without improving the core programmer-life gameplay.

## Future Extension Rule

Additional locations may be introduced only as bounded content scenarios or temporary travel contexts. A second persistent city requires a new ADR, a proven gameplay need, and a demonstrated content-production budget.
