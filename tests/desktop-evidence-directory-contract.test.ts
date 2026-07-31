import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { requiredPreparedEvidenceDirectory } from "../tools/desktop-evidence/src/capture-startup";
import { EVIDENCE_DIRECTORY_ENV } from "../tools/desktop-evidence/src/run-capture-process";

const PREFIX = "runtime-human-desktop-evidence-";

describe("desktop evidence prepared directory contract", () => {
  it("accepts one direct prefixed child of the system temporary directory", () => {
    const path = join(tmpdir(), `${PREFIX}prepared`);

    expect(requiredPreparedEvidenceDirectory({ [EVIDENCE_DIRECTORY_ENV]: path })).toBe(path);
  });

  it("requires the closed parent-to-child environment variable", () => {
    expect(() => requiredPreparedEvidenceDirectory({})).toThrow(
      new RegExp(`${EVIDENCE_DIRECTORY_ENV} is required`, "u"),
    );
  });

  it.each([
    join(tmpdir(), "unprefixed"),
    join(tmpdir(), `${PREFIX}prepared`, "nested"),
    join(dirname(tmpdir()), `${PREFIX}escape`),
  ])("rejects an unsafe prepared path: %s", (path) => {
    expect(() => requiredPreparedEvidenceDirectory({ [EVIDENCE_DIRECTORY_ENV]: path })).toThrow(
      /not a direct Runtime Human evidence directory/u,
    );
  });
});
