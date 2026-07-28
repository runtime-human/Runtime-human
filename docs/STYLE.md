---
title: "Documentation metadata convention"
type: index
status: draft
canon: true
depends_on: [ADR-013, ADR-015]
updated: 2026-07-28
---

# Documentation metadata convention

Every `docs/**/*.md` file starts with YAML front-matter:

```yaml
---
title: Human-readable title
type: adr | engine | ui | plan | research | architecture | content | events | simulation | agent | source | index
status: accepted | draft | superseded | proposed | completed
superseded_by: docs/superpowers/plans/2026-07-28-replacement.md
canon: true | false
depends_on: [ADR-013, ADR-015]
updated: 2026-07-28
---
```

`superseded_by` is optional and appears only on a superseded document.

## Field rules

- `title` is the player- or developer-facing document title.
- `type` is derived from the directory by `scripts/build-toc.mjs` and validated in CI.
- `status` uses the closed set `accepted | draft | superseded | proposed | completed`; unknown values are rejected.
- numbered ADR files use only `accepted`, `proposed` or `superseded` after review.
- implementation plans under `docs/superpowers/plans/` use `completed`; an obsolete historical plan may use `superseded` only with `superseded_by`.
- `superseded_by` is a repository-relative `docs/**/*.md` path to an existing replacement document. It cannot reference the same file and is invalid on any non-superseded document.
- other plans default to `draft` until their own workflow defines a stronger status.
- research and source documents default to `canon: false`; accepted ADRs and synchronized specifications default to `canon: true`.
- `depends_on` contains stable `ADR-###` identifiers found in or intentionally associated with the document.
- `updated` records the last meaningful content or metadata change in ISO `YYYY-MM-DD` form.

The validator checks metadata and links only. It does not schedule work, execute plans or turn documentation into a workflow engine.

## Manifest

`docs/MANIFEST.jsonc` is deterministic generated output. It contains the normalized metadata index, type counts, dependency links and an optional supersession target. It deliberately contains no wall-clock generation timestamp, so a clean regeneration produces no diff.

Commands:

```bash
node scripts/build-toc.mjs
node scripts/build-toc.mjs --check
```

The first command adds missing front-matter and regenerates the manifest/catalog. The second command performs read-only validation and fails when metadata, supersession links or committed derived artifacts are stale.
