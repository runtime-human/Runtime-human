---
title: "NO-GEOGRAPHY-SCOPE"
type: architecture
status: draft
canon: true
updated: 2026-07-18
---

# Geography scope guard

The core game contains exactly one persistent fictional metropolis.

Without a new accepted ADR, implementation must not add:

- selectable countries or cities;
- permanent relocation;
- visas, citizenship or immigration;
- per-country currencies/taxes/laws;
- persistent foreign labor or housing markets;
- world/city map simulation.

Temporary travel is a bounded event and cannot create a second persistent world state.