# Runtime Human — product router

This file is a compact routing map for AI workers. It does not replace the repository canon.

## Product identity

Runtime Human is a PC-first, Windows-first, offline-first casual programmer-development simulator. Programming mastery and professional expression are the core game; life and narrative systems support them rather than compete with them.

Canonical start: January 1990, age 12. One turn is one month. Ordinary play should present rare, concrete, consequence-bearing decisions rather than daily chores, ticket simulation, generic XP grinding, or an embedded IDE.

## Core loop

```text
month advances
→ small number of programmer-development situations
→ concrete choice
→ deterministic consequence
→ learning/project/evidence/career projection
→ long-lived programmer identity
```

## Explicit non-goals

```text
not an embedded IDE
not a daily ticket simulator
not a generic life sim with programming as one profession
not an LLM-judged coding test
not a live-service backend-dependent game
```

## Authority

Use the repository's existing priority order from `AGENTS.md`:

1. accepted ADR;
2. specialized specification;
3. master/full architecture;
4. implementation plan;
5. issue/PR;
6. research/system design/external sources;
7. code comments.

Start navigation at `docs/INDEX.md`. For current implementation status use `docs/EXECUTION-STATUS.jsonc`.

## Studio rule

`.studio/`, `gamestudio/`, `opencode.json`, `orca.yaml`, and `.agents/skills/` define how AI workers are coordinated. They are operational guidance only and may not override product or architecture canon.

Workers should load only the context required for their zone from `.studio/context-map.json` instead of bulk-reading the documentation tree.
