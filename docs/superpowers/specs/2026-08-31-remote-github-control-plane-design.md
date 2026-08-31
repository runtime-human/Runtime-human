# Remote GitHub Control Plane Design

**Status:** proposed-for-implementation

**Date:** 2026-08-31

**Scope:** Runtime Human development workflow when ChatGPT and GitHub are the primary development environment and no local workstation is assumed.

## Decision

Runtime Human will use GitHub as the durable execution and evidence plane, ChatGPT as the interactive producer/reviewer, `.studio` as repository-development intelligence, and `gamectl` as the headless game-development API.

The design deliberately keeps repository orchestration and game semantics separate:

```text
ChatGPT
   |
   | GitHub API / PR comments / commits
   v
GitHub repository
   |
   +--> studioctl  ---- repository scope/risk/evidence
   |
   +--> gamectl    ---- game/catalog/schema/simulation semantics
   |
   +--> GitHub Actions ---- ephemeral remote execution
   |
   `--> PR checkpoint + JSON artifacts ---- durable state
```

No local machine, self-hosted runner, long-lived agent process, separate backend, MCP wrapper, or second orchestration service is required for normal development.

## Goals

1. Let ChatGPT inspect, modify, verify and review the repository through GitHub without relying on a local checkout.
2. Make exact repository state and exact game-tool capabilities discoverable rather than inferred from memory.
3. Produce compact, versioned, machine-readable evidence tied to exact base/head SHAs.
4. Keep full logs available for root-cause analysis while avoiding log-reading as the normal control path.
5. Allow a small set of safe `/rh ...` pull-request commands to request remote read-only analysis.
6. Preserve `pnpm verify` as the single V3 authority.
7. Preserve `gamectl` as a thin headless game API; Git/GitHub semantics do not enter `gamectl`.
8. Preserve the existing `.studio` zone/risk/task/finding contracts rather than introducing another task model.
9. Make chat-session loss recoverable from GitHub durable state.
10. Establish one explicit game-version contract beginning at `0.0.1` and advancing only by `0.0.1` per release.

## Non-goals

- No autonomous always-on bot or GitHub App backend.
- No generic shell execution from PR comments.
- No `pull_request_target` execution of PR code.
- No `workflow_run` privileged evidence aggregator.
- No Git awareness inside `gamectl`.
- No arbitrary plugin framework for CLI commands.
- No MCP endpoint per CLI operation.
- No release automation in this first implementation beyond version consistency tooling.
- No Rulesets/Actions Policies requirement in this implementation. Workflow execution protections are useful later, but currently rely on GitHub rulesets and remain explicitly deferred.

## Current repository facts

The repository already has the important foundations:

- `gamectl` is a thin CLI over `@runtime-human/game-devtools` and `@runtime-human/game-simulation`, with a versioned JSON envelope and closed exit-code contract.
- `.studio/task-contract.md` already defines zones, risk, must-read/may-read context, allowed/forbidden writes and verification expectations.
- `.studio/verification-policy.json` already defines V0-V4 and makes `pnpm verify` the V3 authority.
- `.studio/finding-contract.md` already defines durable review evidence.
- PR #82 moves ordinary verification to GitHub-hosted runners and establishes a read-only public-CI baseline.
- the game version is already `0.0.1` in root `package.json`, desktop `package.json`, Rust `Cargo.toml` and `tauri.conf.json`.

The missing layer is a remote protocol joining these pieces without creating a second authority.

## GitHub constraints confirmed against August 2026 documentation

### `issue_comment`

GitHub runs `issue_comment` workflows from the default branch. `GITHUB_SHA`/`GITHUB_REF` identify the default branch, not the commented pull-request head. Therefore a remote command must resolve the pull request by number, then resolve and pin its exact head SHA before target execution.

The workflow file and command parser must already exist on the default branch before `/rh ...` comments can trigger them end-to-end.

### Untrusted context

GitHub documents issue/PR bodies, comments, titles, refs and similar context fields as untrusted input. Comment text must never be embedded directly in a `run:` script or interpreted as shell.

The command body is passed as data to a strict Node parser. The parser emits a closed typed request. Execution uses fixed argument arrays with `shell: false` semantics.

### Privileged triggers

GitHub explicitly warns that `pull_request_target` and `workflow_run` become dangerous when they check out or process untrusted PR code with privileged credentials/caches. This design does not use either trigger for remote execution or evidence aggregation.

### Cache behavior

GitHub currently prevents `issue_comment` and other low-trust triggers from creating/overwriting default-branch caches. Remote commands do not rely on cache writes and use `pnpm install --ignore-scripts` unless a command explicitly requires otherwise.

### Artifact use

GitHub Actions artifacts are appropriate for compact machine evidence and can use short per-artifact retention. They are not used as release provenance. Release binaries will later use immutable releases and artifact attestations instead.

## CLI boundaries

### `gamectl`

`gamectl` answers game-development questions only:

- what game entities/contracts exist;
- where game content comes from;
- what references/impact an entity has;
- what schemas are legal;
- what fingerprints define active game data/rules;
- what deterministic simulation/replay/explanation proves.

`gamectl` stays read-only in normal use and remains ignorant of pull requests, branches, GitHub runs and review state.

### `studioctl`

A new thin facade over existing `.studio` tooling answers repository-development questions:

- what changed between two exact Git objects;
- which zones and authorities are affected;
- what risk applies;
- what context/skills should be loaded;
- which verification is required;
- what compact evidence describes the current PR head.

`studioctl` does not become a second orchestrator. Existing `studio:*` scripts remain implementation modules/compatibility entry points during migration.

## `studioctl` v1

Root command:

```text
pnpm studioctl <command>
```

JSON output uses exactly one stdout object when `--json` is supplied.

### `studioctl capabilities --json`

Returns exact installed control-plane capabilities and schema versions.

Schema: `runtime-human-studio-capabilities-v1`.

Minimum fields:

```json
{
  "schemaVersion": "runtime-human-studio-capabilities-v1",
  "commands": {
    "inspect": 1,
    "verify": 1,
    "evidence": 1
  },
  "contracts": {
    "inspection": "runtime-human-change-inspection-v1",
    "evidence": "runtime-human-pr-evidence-v1",
    "taskEnvelope": "runtime-human-task-envelope-v1"
  },
  "verification": {
    "v3": "pnpm verify",
    "v4": "pnpm verify:release"
  }
}
```

### `studioctl inspect --base <sha> --head <sha> --json`

Read-only exact-diff inspection.

Schema: `runtime-human-change-inspection-v1`.

It reuses existing zone/risk/context/skill/finding logic and reports, at minimum:

- exact `baseSha` and `headSha`;
- stable sorted changed paths;
- affected zones and primary zone;
- risk;
- authority-impact flags (`canon`, `gameplay`, `persistence`, `schema`, `security`, `ciGovernance`);
- active skills;
- budgeted `mustRead`/`mayRead`;
- `allowedWrite`/`forbiddenWrite` when derivable;
- relevant unresolved finding IDs/fingerprints;
- required/recommended verification tiers;
- whether V3 is recommended before merge.

The command never writes `.studio/runtime` state.

### `studioctl verify --tier V0|V1|V2`

Thin facade over the existing verification planner/runner. V3/V4 are intentionally refused by the remote command protocol because ordinary PR CI already owns V3 and releases own V4.

Local/manual CLI use may continue to expose the existing V3/V4 commands through their canonical package scripts; `studioctl` does not redefine them.

### `studioctl evidence`

Produces a compact file, not a new quality judgment.

Schema: `runtime-human-pr-evidence-v1`.

Minimum shape:

```json
{
  "schemaVersion": "runtime-human-pr-evidence-v1",
  "baseSha": "...",
  "headSha": "...",
  "generatedAt": "...",
  "inspection": {},
  "verification": {
    "gate": "pnpm verify",
    "outcome": "success|failure|cancelled",
    "runId": null
  },
  "game": {
    "version": "0.0.1",
    "rulesFingerprint": null,
    "contentFingerprint": null,
    "balanceFingerprint": null
  },
  "findings": {
    "blocking": [],
    "relevantOpen": []
  }
}
```

Evidence reports facts. It does not set findings to resolved, approve a PR, or claim merge readiness by itself.

## `gamectl` v2 additions

The existing envelope remains `runtime-human-gamectl-v1` for transport compatibility. New command-result payloads get their own versioned schemas where needed.

### `gamectl capabilities --json`

Purpose: exact-target discovery for ChatGPT.

Schema: `runtime-human-gamectl-capabilities-v1`.

Returns supported command IDs/versions and important game contract schema versions. This prevents an agent from assuming that a planned command exists.

### `gamectl catalog inspect <id> --json`

Composes existing catalog functions; it does not create new authority.

Result includes:

- entity identity and normalized metadata;
- source path;
- outgoing/incoming references;
- consumers;
- tests;
- zones;
- impact projection.

This replaces four common agent round-trips (`show`, `refs`, `impact`, `source`) with one deterministic projection.

### `gamectl catalog search <query> --json`

Deterministic search, not fuzzy/LLM ranking.

Searches normalized lowercase values across a closed field set: `id`, `kind`, `era`, `domain`, `sourcePath`. Results are stable-sorted by exact-ID match first, ID-prefix match second, then lexical ID. No embedding/vector dependency is introduced.

### `gamectl schema list --json`

Lists only authoring schemas actually exported by `@runtime-human/game-authoring-schema`.

Initial families:

- content-source authoring;
- quality balance;
- skill-evidence balance.

### `gamectl schema show <family> --json`

Returns a deterministic schema projection suitable for an agent: schema/version, required fields, property kinds, enums/consts and numeric/string constraints. The TypeBox/JSON-Schema object remains the authority; the projection is derived.

### `gamectl fingerprint --json`

Returns the active game version plus any fingerprints that can be computed from current canonical/compiled sources without mutating state. Missing/unavailable fingerprint families are explicit `null`, never guessed.

## Remote PR command protocol

Workflow: `.github/workflows/remote-command.yml`.

Trigger:

```yaml
on:
  issue_comment:
    types: [created]
```

The workflow is not a merge gate.

### Initial grammar

Only these forms are accepted:

```text
/rh help
/rh inspect
/rh verify v1
/rh verify v2
/rh game capabilities
/rh game catalog inspect <id>
/rh game catalog search <query>
/rh game schema list
/rh game schema show <family>
/rh game fingerprint
```

Simulation/replay commands remain direct `gamectl` functionality in v1 of the control plane and are added to `/rh` only after the command transport has passed a real post-merge end-to-end security test.

No arbitrary command, path, environment variable, shell fragment, output redirect or extra flag is accepted.

### Admission rules

A remote command executes target code only when all are true:

1. comment is on a pull request, not a plain issue;
2. body starts with `/rh` and parses completely under the closed grammar;
3. commenter has repository permission `write`, `maintain` or `admin` as resolved through the GitHub API;
4. PR head repository equals `runtime-human/Runtime-human` (fork PRs are rejected);
5. exact PR `head.sha` is resolved through the GitHub API and used as the target;
6. workflow token has only required read permissions;
7. no repository or environment secrets are supplied to the target execution job.

### Two-checkout model

Security-critical control code and target PR code are separated:

```text
control/  -> default-branch SHA (trusted parser/admission code)
target/   -> exact validated PR head SHA
```

The comment parser/admission layer runs from `control/` before target dependency installation or execution.

Target dependency install uses frozen lockfile and `--ignore-scripts` for the initial command set.

### Output

Every accepted request emits one artifact:

```text
runtime-human-remote-result-<comment-id>.json
```

Schema: `runtime-human-remote-result-v1`.

It includes comment ID, PR number, exact head SHA, parsed request, exit code, command schema/version and result/error envelope. Retention target: 7 days.

A compact human result is written to `GITHUB_STEP_SUMMARY`. The workflow does not need `issues: write` and does not post bot comments.

ChatGPT finds the run using the PR/comment identifier in `run-name`, reads the artifact/result, and updates the durable chat checkpoint through the GitHub API itself.

## Foundation evidence

The current `foundation` workflow remains the V3 authority and continues to invoke exactly `pnpm verify`.

It gains compact evidence generation in the same unprivileged `pull_request` run. No separate `workflow_run` aggregator is introduced.

The implementation must preserve final job failure semantics when V3 fails. Evidence generation must run after verification on both success and failure and must never convert a failing verification into a successful check.

The resulting artifact is named with the exact head SHA and retained for a short period (target 14 days).

Full Actions logs remain diagnostic evidence; the JSON artifact is the normal machine interface.

## Durable chat checkpoint

Chat memory is treated as cache. GitHub is durable state.

For active implementation PRs ChatGPT maintains one top-level PR comment containing the marker:

```text
<!-- runtime-human-chat-checkpoint-v1 -->
```

The comment is updated rather than appended repeatedly.

Minimum fields:

```text
Head: <sha>
Stage: design|implementation|verification|review|blocked
Objective: <one paragraph>
Completed: <compact list>
Blocking findings: <ids or none>
Latest evidence: <run/artifact refs or none>
Next: <single next action>
```

The checkpoint is informational. Machine authority stays in Git, Actions and `.studio` contracts.

## Game versioning contract

### Rule

The game starts at `0.0.1`.

Every release increments the third numeric component by exactly one:

```text
0.0.1 -> 0.0.2 -> 0.0.3 -> ...
```

No release may skip, decrement or reuse a number.

This is an intentional project numbering scheme. SemVer compatibility meaning is not inferred from major/minor/patch positions.

Internal PRs do not automatically increment the game version. A version change occurs only in an explicit release/version-bump change.

### Authority

`apps/desktop/src-tauri/tauri.conf.json > version` is the canonical game/app version because Tauri 2 recommends that configuration field as the application-version source.

The following are required mirrors and must equal the canonical value:

- root `package.json > version`;
- `apps/desktop/package.json > version`;
- `apps/desktop/src-tauri/Cargo.toml [package].version`;
- the Runtime Human package entry in `Cargo.lock` when present.

### Tooling

Add:

```text
pnpm version:check
pnpm version:bump
```

`version:check` is read-only and enters `check:fast`.

It validates:

- canonical format `0.0.N` with integer `N >= 1`;
- all mirrors match;
- no unsupported prerelease/build metadata;
- Cargo lock metadata is synchronized.

`version:bump` is an explicit mutation tool. It computes exactly `N+1`, updates all mirrors and refuses an explicit target that is not the immediate next version. It does not create a tag, release or commit.

Future release automation uses tag `v0.0.N`, draft-release-first publication, immutable releases when enabled, and artifact attestations for distributed binaries. Attestations are not generated for ordinary test/evidence artifacts.

## Repository security and settings follow-up

Not part of the first code implementation, but recommended after the control plane is merged:

- restricted default `GITHUB_TOKEN` permissions;
- squash-only repository merge policy;
- auto-delete merged branches;
- Private Vulnerability Reporting;
- Dependency Review on PRs;
- CodeQL default setup, including GitHub Actions analysis;
- secret scanning and push protection where available;
- immutable releases before public binary distribution;
- artifact attestations for release binaries;
- evaluate GitHub Workflow Execution Protections later, after Rulesets are intentionally in scope.

## Testing strategy

### Unit/contract tests

- command parser accepts every documented `/rh` form and rejects shell metacharacters, unknown flags, paths and trailing garbage;
- admission logic rejects issues, forks and insufficient permissions;
- `studioctl inspect` produces stable output for fixture diffs;
- capability outputs are closed and versioned;
- catalog search ordering is deterministic;
- schema projection matches exported TypeBox schemas;
- version checker catches drift in every mirror;
- version bump enforces exactly `N+1`.

### Workflow tests before merge

Because `issue_comment` uses the default-branch workflow definition, full comment-trigger E2E cannot be truthfully claimed before merge.

Before merge the PR must prove:

- YAML parses and normal PR CI is green;
- parser/admission tests are green;
- a pull-request smoke path can execute the remote-command job logic without granting write permissions;
- `foundation` creates evidence on success and on an intentionally failing fixture/test harness path without masking failure.

### Mandatory post-merge E2E

Immediately after merge, create/use a controlled PR and exercise:

```text
/rh help
/rh inspect
/rh game capabilities
/rh verify v1
```

Verify exact head pinning, artifact retrieval, no write permissions, rejected malformed command, rejected non-PR issue comment and rejected unauthorized actor/fork path through tests or controlled fixtures.

The remote command feature is not considered operationally complete until this post-merge E2E is recorded.

## Rollout sequence

### Slice A — protocol and version foundation

- game-version checker/bump contract;
- `studioctl capabilities` and `inspect`;
- `gamectl capabilities`;
- schemas/tests/docs.

### Slice B — game introspection

- catalog inspect;
- deterministic catalog search;
- schema list/show;
- fingerprint projection.

### Slice C — CI evidence

- `runtime-human-pr-evidence-v1`;
- foundation artifact generation on success/failure;
- short retention and exact SHA identity.

### Slice D — remote command transport

- strict default-branch parser;
- admission/permission resolver;
- two-checkout workflow;
- remote-result artifact;
- PR smoke/security tests.

### Slice E — post-merge operational proof

- real `/rh` comment E2E;
- durable checkpoint comment;
- recorded evidence;
- only then expand remote grammar to simulation/replay if useful.

## Acceptance criteria

The first implementation is complete when all of the following are true:

1. normal development and verification require no local/self-hosted runner;
2. `pnpm verify` remains the only V3 executable authority;
3. ChatGPT can discover exact `studioctl` and `gamectl` capabilities;
4. ChatGPT can obtain one structured change inspection for exact base/head SHAs;
5. a foundation run produces `runtime-human-pr-evidence-v1` without masking failures;
6. `/rh` parser/admission rules have deterministic tests and no arbitrary-shell path;
7. the remote workflow executes only same-repository PR heads for write-or-higher commenters, with read-only permissions and no secrets;
8. game introspection reduces common multi-call repository inspection without introducing new game authority;
9. all version mirrors remain `0.0.1` until an explicit release bump;
10. `version:bump` can only produce the immediate next `0.0.N` value;
11. documentation distinguishes pre-merge transport verification from mandatory post-merge `issue_comment` E2E;
12. no Rulesets, GitHub App backend, MCP layer or second orchestrator is introduced.

## Explicitly rejected alternatives

### Put everything in `gamectl`

Rejected because GitHub/review/task semantics would make `gamectl` a God-object and couple game tooling to repository hosting.

### Create a second agent/orchestrator service

Rejected because GitHub already supplies durable state, isolated compute, logs, artifacts and access control. A backend would add deployment, auth, storage and failure modes before there is evidence it is needed.

### Use `workflow_run` to aggregate PR evidence

Rejected because it creates unnecessary privilege/caching complexity. Evidence can be generated in the same read-only PR run.

### Use `pull_request_target` for remote commands

Rejected because the design intentionally executes selected PR-head tooling. Combining that with privileged target-context execution is an unnecessary security risk.

### Allow arbitrary `/rh run <shell>`

Rejected. Remote comments are a typed RPC surface, not a terminal.

### Auto-bump version on every merged PR

Rejected. The version represents released game builds, not repository activity.

## Official references reviewed on 2026-08-31

- GitHub Actions events and `issue_comment`: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub Actions script injection guidance: https://docs.github.com/en/actions/concepts/security/script-injections
- GitHub Actions secure-use guidance: https://docs.github.com/en/actions/reference/security/secure-use
- GitHub Actions workflow permissions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions dependency caching/security: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- GitHub Actions artifacts: https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitHub artifact attestations: https://docs.github.com/en/actions/concepts/security/artifact-attestations
- GitHub immutable releases: https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases
- GitHub Dependency Review: https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/configure-dependency-review-action
- GitHub CodeQL default setup: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning
- GitHub Workflow Execution Protections (preview, deferred): https://docs.github.com/en/organizations/managing-organization-settings/actions-policies/workflow-execution-protections
- Tauri 2 distribution/versioning: https://v2.tauri.app/distribute/
