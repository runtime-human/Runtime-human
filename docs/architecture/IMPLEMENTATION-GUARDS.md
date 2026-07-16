# Implementation guards

- No game rule in React or Rust adapters.
- No raw SQL or arbitrary filesystem access in renderer.
- No system time or Math.random in Game Core.
- No floating-point authoritative finance/probability/progress.
- No executable content/mod scripts.
- No stable content ID reuse.
- No partial month writes to authoritative save.
- No backend, telemetry, payments or Steam without a new accepted ADR.
- No second persistent location without a new accepted ADR.
