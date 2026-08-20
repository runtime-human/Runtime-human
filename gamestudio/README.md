# Runtime Human Game Studio

This is a Runtime Human-specific adaptation of the large-batch/risk-based ideas popularized by `studioigor/gamestudio`. It is intentionally smaller than general-purpose 30–80-agent game-studio frameworks.

The repo already contains domain-specific agent canon under `docs/agents/`; this layer routes to that knowledge instead of duplicating it.

Read in this order:

1. `START_PROMPT.md` — start/resume the Producer;
2. `STUDIO.md` — operating model;
3. `ORCA.md` — Orca-specific safe dispatch patterns;
4. `.studio/*` — machine-readable routing and context maps.

External references and the reasons they were adopted are recorded in `SOURCES.md`.
