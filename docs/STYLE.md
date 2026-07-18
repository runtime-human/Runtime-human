# Documentation metadata convention

Every `docs/**/*.md` file starts with YAML front-matter:

```yaml
---
title: Human-readable title
type: adr | engine | ui | plan | research | architecture | content | events | simulation | agent | source | index
status: accepted | draft | superseded | proposed | completed
canon: true | false
depends_on: [ADR-013, ADR-015]
updated: 2026-07-19
---
```

## Field rules

- `title` is the player- or developer-facing document title.
- `type` is derived from the directory by `scripts/build-toc.mjs` and validated in CI.
- numbered ADR files use `accepted` unless their front-matter explicitly records another reviewed status.
- implementation plans under `docs/superpowers/plans/` use `completed`; other plans default to `draft`.
- research and source documents default to `canon: false`; accepted ADRs and synchronized specifications default to `canon: true`.
- `depends_on` contains stable `ADR-###` identifiers found in or intentionally associated with the document.
- `updated` records the last meaningful content or metadata change in ISO `YYYY-MM-DD` form.

## Manifest

`docs/MANIFEST.jsonc` is deterministic generated output. It contains the normalized metadata index, type counts and source update boundary. It deliberately contains no wall-clock generation timestamp, so a clean regeneration produces no diff.

Commands:

```bash
node scripts/build-toc.mjs
node scripts/build-toc.mjs --check
```

The first command adds missing front-matter and regenerates the manifest. The second command performs read-only validation and fails when metadata or the committed manifest is stale.
