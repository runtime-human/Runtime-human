import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseJsonc } from "jsonc-parser";
import { describe, expect, it } from "vitest";

import { parseGameplayFixtureV1 } from "@runtime-human/game-simulation";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

describe("gameplay fixture v1 closed parser", () => {
  it("accepts the committed january-start fixture", async () => {
    const text = await readFile(
      path.join(repositoryRoot, "fixtures", "gameplay", "january-start.jsonc"),
      "utf8",
    );
    const parsed = parseGameplayFixtureV1(parseJsonc(text));
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;
    expect(parsed.fixture).toEqual({
      schemaVersion: "gameplay-fixture-v1",
      id: "january-start",
      slice: "january-1990",
      seed: 42,
      answers: {},
    });
  });

  it("accepts partial January intent answers", () => {
    const parsed = parseGameplayFixtureV1({
      schemaVersion: "gameplay-fixture-v1",
      id: "january-before-defect",
      slice: "january-1990",
      seed: 7,
      answers: { access: "home-pc", learning: "edit-and-debug" },
    });
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;
    expect(parsed.fixture.answers).toEqual({ access: "home-pc", learning: "edit-and-debug" });
  });

  it("rejects broken fixtures", () => {
    const valid = {
      schemaVersion: "gameplay-fixture-v1",
      id: "f",
      slice: "january-1990",
      seed: 1,
      answers: {},
    };
    const cases: readonly { value: unknown; code: string }[] = [
      { value: null, code: "FIXTURE_INVALID" },
      { value: [], code: "FIXTURE_INVALID" },
      { value: { ...valid, extra: 1 }, code: "FIXTURE_INVALID" },
      { value: { ...valid, schemaVersion: "gameplay-fixture-v2" }, code: "FIXTURE_INVALID" },
      { value: { ...valid, id: "" }, code: "FIXTURE_INVALID" },
      { value: { ...valid, id: 7 }, code: "FIXTURE_INVALID" },
      { value: { ...valid, seed: 1.5 }, code: "FIXTURE_INVALID" },
      { value: { ...valid, seed: -1 }, code: "FIXTURE_INVALID" },
      { value: { ...valid, seed: "7" }, code: "FIXTURE_INVALID" },
      {
        value: { ...valid, slice: "january-1991" },
        code: "FIXTURE_SLICE_UNSUPPORTED",
      },
      { value: { ...valid, answers: null }, code: "FIXTURE_INVALID" },
      { value: { ...valid, answers: [] }, code: "FIXTURE_INVALID" },
      {
        value: { ...valid, answers: { access: "internet-cafe" } },
        code: "FIXTURE_ANSWER_INVALID",
      },
      {
        value: { ...valid, answers: { learning: "speedrun" } },
        code: "FIXTURE_ANSWER_INVALID",
      },
      {
        value: { ...valid, answers: { response: "ignore" } },
        code: "FIXTURE_ANSWER_INVALID",
      },
      {
        value: { ...valid, answers: { mood: "curious" } },
        code: "FIXTURE_ANSWER_INVALID",
      },
    ];
    for (const candidate of cases) {
      const parsed = parseGameplayFixtureV1(candidate.value);
      expect(parsed.kind).toBe("invalid");
      if (parsed.kind === "invalid") {
        expect(parsed.diagnostics[0]?.code).toBe(candidate.code);
      }
    }
  });

  it("rejects prototype-less documents", () => {
    const parsed = parseGameplayFixtureV1(
      Object.assign(Object.create(null), {
        schemaVersion: "gameplay-fixture-v1",
        id: "f",
        slice: "january-1990",
        seed: 1,
        answers: {},
      }),
    );
    expect(parsed.kind).toBe("invalid");
  });
});
