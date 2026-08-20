# Runtime Human AI Studio

This directory is the machine-readable control plane for the local AI development studio. Product and architecture authority remains in `AGENTS.md` and `docs/`.

- `project.json` — commands, concurrency and batching defaults;
- `models.json` — explicit model/risk routing and retry policy;
- `zones.json` — architecture-zone ownership and R3 promotion triggers;
- `context-map.json` — selective context routing;
- `producer.md` — persistent Producer + owner-question contract;
- `task-contract.md` — task and worker handoff format.

Start the interactive Producer with the prompt in `gamestudio/START_PROMPT.md`. Run `pnpm studio:doctor` after cloning on a new machine to see which local tools are ready.

Ephemeral orchestration/metrics state belongs under `.studio/runtime/` and is intentionally ignored by Git.
