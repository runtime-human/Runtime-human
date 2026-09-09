import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("authoritative V3 Rust compilation cache", () => {
  it("uses a bounded pinned sccache cache without caching verification authority", () => {
    const foundation = read(".github/workflows/foundation.yml");

    expect(foundation).toContain(
      "Mozilla-Actions/sccache-action@fc920bf0ec8de6ee65d409111f7ec508035751ba # v0.0.11",
    );
    expect(foundation).toContain('version: "v0.17.0"');
    expect(foundation).toContain(
      "actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0",
    );
    expect(foundation).toContain("RUSTC_WRAPPER: sccache");
    expect(foundation).toContain("SCCACHE_DIR: ${{ github.workspace }}\\.cache\\sccache");
    expect(foundation).toContain('SCCACHE_CACHE_SIZE: "2G"');
    expect(foundation).toContain("path: .cache/sccache");
    expect(foundation).toContain(
      "key: rust-sccache-v1-${{ runner.os }}-rust-1.97.1-${{ hashFiles('apps/desktop/src-tauri/Cargo.lock', 'apps/desktop/src-tauri/Cargo.toml') }}",
    );
    expect(foundation).toContain("restore-keys: |");
    expect(foundation).toContain("rust-sccache-v1-${{ runner.os }}-rust-1.97.1-");

    expect(foundation).not.toContain("SCCACHE_GHA_ENABLED");
    expect(foundation).not.toContain("fail-on-cache-miss: true");
    expect(foundation).not.toMatch(/path:\s+.*(?:evidence|simulation|node_modules)/u);

    expect(foundation).toContain("pnpm verify");
    expect(foundation).toContain("Run canonical base simulation");
    expect(foundation).toContain("Run canonical head simulation");
    expect(foundation).toContain("Compare canonical simulation reports");
  });
});
