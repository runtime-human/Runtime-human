# Documentation metadata convention

Every `docs/**/*.md` file MUST start with a YAML front-matter block:

```yaml
---
title: Human-readable title
type: adr | engine | ui | balance | plan | research | architecture | content | events | simulation | agent | source | index
status: accepted | draft | superseded | proposed | completed
canon: true | false          # true = MVP/authoritative canon; false = extended/deferred
depends_on: [ADR-013]        # related ADR / doc ids (optional)
updated: 2026-07-18         # ISO date of last meaningful change
---
```

## Field rules

- `type` is derived from the directory the file lives in (see `scripts/build-toc.mjs`).
- `status`:
  - `adr` files use Accepted/Proposed/Superseded/Rejected.
  - `plan` files use draft/completed.
  - `research` files use draft (research is never canon without ADR sync).
- `canon: false` marks Extended/Deferred features per ADR-015 budget; these are excluded from the MVP-scope TOC view.
- `depends_on` links the document to its authoritative ADR(s) for traceability.

## Generation

`scripts/build-toc.mjs` reads front-matter from every file and (re)generates the
machine-checkable `docs/MANIFEST.jsonc` and validates that each Accepted ADR has at
least one `depends_on` reference. Run it in CI via `pnpm docs:lint`.
