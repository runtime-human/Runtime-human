# Documentation review summary

## Scope

This branch adds the complete architecture documentation set and synchronizes the existing canon with the accepted fixed-fictional-metropolis decision.

## Accepted canon preserved

- ADR-001: historical Gregorian calendar, January 1990, age 12.
- ADR-002: free distribution without Steam or target EU market.
- ADR-003: one fixed fictional metropolis and compressed geography.

## Proposed decisions added

ADR-004 through ADR-010 are intentionally marked `Proposed` and require explicit owner review.

## Main review questions

1. Accept Rust authoritative persistence boundary or defer to prototype?
2. Accept separate pending MonthRun draft?
3. Accept bigint/i64/fixed-point numeric policy?
4. Accept DeterminismManifest?
5. Accept Playwright + WebdriverIO split?
6. Accept Narrative Director as a separate layer?
7. Accept full-save monthly consistency boundary?

## Verification performed

- branch compared against `main`;
- all requested document paths created;
- README, AGENTS, master architecture and historical source policy synchronized;
- no code, migrations, workflows or dependencies changed.
