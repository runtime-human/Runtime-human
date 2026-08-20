---
name: runtime-content
description: Create or change Runtime Human historical/game content and compiler inputs with provenance, stable IDs, chronology and semantic validation.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human content

Read `docs/agents/CONTENT-AGENT.md` and only the relevant content/game-design/ADR files from `.studio/context-map.json`.

Never invent historical dates from memory. Preserve stable IDs unless the task explicitly includes migration/tombstone review. Maintain `sourceRefs`/confidence/provenance, prerequisites, chronology and chain reachability. Content cannot become an authority that mutates save/game state directly.

Run content/schema/semantic checks appropriate to the changed files and report exact evidence.
