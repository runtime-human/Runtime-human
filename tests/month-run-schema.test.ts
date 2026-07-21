import * as gameCore from "@runtime-human/game-core";
import type { AuthoritativeJsonValue as CoreAuthoritativeJsonValue } from "@runtime-human/game-core";
import {
  parseDecisionId,
  parseMonthRunRevision,
  parseRequestId,
  type AuthoritativeJsonValue,
} from "@runtime-human/game-schema";

describe("MonthRun protocol schema", () => {
  it("parses bounded identifiers and non-negative revisions", () => {
    expect(parseRequestId("request-1")).toBe("request-1");
    expect(parseDecisionId("decision-1")).toBe("decision-1");
    expect(parseMonthRunRevision(0)).toBe(0);

    expect(() => parseRequestId("")).toThrow();
    expect(() => parseRequestId("contains whitespace")).toThrow();
    expect(() => parseRequestId("a".repeat(129))).toThrow();
    expect(() => parseMonthRunRevision(-1)).toThrow();
    expect(() => parseMonthRunRevision(1.5)).toThrow();
  });

  it("keeps authoritative JSON available from schema and core", () => {
    const schemaValue: AuthoritativeJsonValue = { ok: [1, true, null] };
    const coreValue: CoreAuthoritativeJsonValue = schemaValue;

    expect(coreValue).toEqual(schemaValue);
  });

  it("does not expose the unsafe low-level checkpoint rehash helper", () => {
    expect(gameCore).not.toHaveProperty("rehashMonthRunCheckpoint");
  });
});
