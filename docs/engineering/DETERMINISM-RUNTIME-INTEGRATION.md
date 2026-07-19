---
title: "Determinism Runtime Integration"
type: engine
status: draft
canon: true
depends_on: [ADR-006, ADR-007]
updated: 2026-07-20
---

# Determinism Runtime Integration

This document records the concrete Phase 0 implementation of the deterministic runtime boundary. It specializes, but does not replace, ADR-006 and ADR-007.

## Dependency decision

Runtime Human reuses focused upstream components rather than maintaining independent implementations of JSON canonicalization, hashing or integer distributions:

| Component | Exact version | License | Runtime Human use |
|---|---:|---|---|
| `canonicalize` | `3.0.0` | Apache-2.0 | RFC 8785 JSON canonicalization after project validation |
| `@noble/hashes` | `2.2.0` | MIT | synchronous SHA-256 and UTF-8/hex codecs |
| `pure-rand` | `8.4.2` | MIT | rejection-based integer and bigint distributions |
| `rand_xoshiro` | `0.8.1` | MIT OR Apache-2.0 | Rust reference implementation and parity oracle for Xoshiro256** |

All versions are exact in manifests and lockfiles. Upgrading any component that can change authoritative bytes, state transitions, range sampling or hashes is a compatibility event requiring reviewed golden-fixture changes and, where applicable, a new manifest identifier.

## Adaptation boundary

Project-owned code is limited to:

- validation of the authoritative JSON subset before RFC 8785 canonicalization;
- domain-separated stable-ID and fingerprint envelopes;
- the TypeScript compatibility port of the published Xoshiro256** transition and SplitMix64 seed expansion;
- exact state serialization and restoration;
- named deterministic stream derivation;
- adapters from Xoshiro output to `pure-rand` integer distributions;
- cross-language golden tests.

The project does not reimplement SHA-256, JCS property ordering or unbiased integer-distribution algorithms.

## Authoritative JSON subset

The canonicalization boundary accepts only:

- `null`, booleans and strings;
- safe integer numbers except negative zero;
- dense arrays;
- plain objects with enumerable data properties and string keys.

It rejects values that normal JSON processing could silently erase, coerce or execute:

- `undefined`, functions, symbols and bigint values;
- fractional, non-finite and unsafe numbers;
- sparse arrays or arrays with additional named properties;
- accessors, non-enumerable properties and symbol keys;
- class instances, dates and other non-plain prototypes;
- cyclic graphs;
- payloads beyond the configured depth/node limits.

Repeated acyclic references are allowed because they have the same canonical tree representation. Big integers cross JSON/IPC boundaries only through separately validated canonical decimal strings.

## Hashing and domain separation

SHA-256 input is the UTF-8 encoding of a validated canonical envelope. Stable IDs and fingerprints use distinct fixed domains:

```text
runtime-human:stable-id:v1
runtime-human:fingerprint:v1
```

The caller also supplies a bounded non-empty namespace. This prevents equal payloads used for different purposes from sharing an identifier accidentally.

SHA-256 here provides stable content addressing and diagnostics. It is not a claim that save files or traces are authenticated against a malicious editor.

## Xoshiro256** state contract

Manifest identifier: `xoshiro256ss-v1`.

State representation:

- four unsigned 64-bit words;
- serialized as 32 bytes;
- each word encoded little-endian, matching `rand_xoshiro::Xoshiro256StarStar::state()`;
- exposed at JSON boundaries as exactly 64 lowercase hexadecimal characters;
- all-zero state is rejected.

Seed representation is an unsigned 64-bit integer. `fromSeed` expands it through the standard SplitMix64 sequence used by the Rust reference implementation.

The authoritative TypeScript API exposes integer operations only. Floating-point sampling is intentionally absent.

## Integer selection

`nextInt(minInclusive, maxExclusive)` requires a non-empty half-open range of JavaScript safe integers and delegates unbiased sampling to `pure-rand`.

`weightedIndex` requires a bounded non-empty list of non-negative safe-integer weights. The total is accumulated as bigint, all-zero input is rejected, and selection delegates to `pure-rand` bigint distribution sampling. UI percentages never feed back into authoritative selection.

## Named streams

`fork(scope)` derives a child state from:

```text
runtime-human:rng-fork:v1
+ parent serialized state
+ explicit scope
```

through SHA-256. Forking does not consume or mutate the parent stream. Equal parent state and scope reproduce the same child; different scopes are isolated. Scope names are part of the versioned rules contract and must not be derived from localized display text or container iteration order.

This hash-derived fork policy is distinct from Xoshiro `jump()` and is used for stable named simulation scopes. Changing it requires a new RNG/stream compatibility version.

## Cross-language fixture

`fixtures/determinism/xoshiro256ss-v1.json` is the shared source for:

- the initial 32-byte state;
- the expected `u64` output sequence;
- the state after the sequence;
- the SplitMix64 expansion of seed `42`.

Vitest executes the fixture against the TypeScript adapter. Cargo tests execute the same fixture against `rand_xoshiro 0.8.1`. A fixture update must explain whether it represents an intended algorithm/version change or a defect correction; unexplained regeneration is forbidden.

## CI contract

The permanent verification contract includes:

- docs freshness, Oxfmt, Oxlint, TypeScript project references and package boundaries;
- TypeScript unit/golden tests;
- type-aware lint, Vite build and Storybook build;
- `cargo fmt --check`;
- `cargo check --locked`;
- `cargo test --locked` including Rust parity.

CI remains read-only. Temporary write-enabled generation jobs used during branch bootstrapping must not exist in a merge-ready diff.

## Deferred scope

This integration does not implement:

- persistence or save authentication;
- MonthRun state/checkpoint logic;
- gameplay formulas, content selection or balance policy;
- event/project/career identifiers;
- cryptographic random generation;
- migrations from a previous RNG manifest.

Those systems consume these contracts in later tasks rather than extending this package speculatively.
