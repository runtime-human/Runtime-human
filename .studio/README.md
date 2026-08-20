# Runtime Human AI Studio

This directory is the machine-readable control plane for the local AI development studio. Product and architecture authority remains in `AGENTS.md` and `docs/`.

- `project.json` — commands, concurrency and batching defaults;
- `models.json` — explicit model/risk routing and retry policy;
- `zones.json` — architecture-zone ownership and R3 promotion triggers;
- `context-map.json` — selective context routing;
- `producer.md` — persistent Producer + owner-question + finding-ledger contract;
- `task-contract.md` — task and worker handoff format;
- `finding-policy.json` — severity/size/scope/disposition, clustering and recurrence policy;
- `finding-contract.md` — read-only reviewer output and Producer disposition contract;
- `findings/ledger.jsonl` — tracked open review failure classes;
- `findings/resolved.jsonl` — tracked verified/closed finding history.

Start the interactive Producer with the prompt in `gamestudio/START_PROMPT.md`. Run `pnpm studio:doctor` after cloning on a new machine to see which local tools are ready.

Finding commands:

```text
pnpm studio:finding:add -- --zone <zone> --severity <S0..S4> --size <XS..XL> --scope <scope> --category <class> --component <component> --summary "..."
pnpm studio:findings -- --json
pnpm studio:findings:cluster -- --json
pnpm studio:findings:promote
pnpm studio:finding:resolve -- --id <RF-...> --root-cause "..." --prevention regression-test
```

The reviewer stays read-only; the Producer is the normal ledger writer. Ephemeral orchestration/metrics state belongs under `.studio/runtime/` and is intentionally ignored by Git.
