import { describe, expect, it } from "vitest";

import {
  DOCUMENT_STATUSES,
  validateDocumentationMetadata,
  validateSupersessionTargets,
} from "../scripts/docs-metadata.mjs";

function metadata(status: string, supersededBy?: string) {
  return supersededBy === undefined
    ? { status }
    : { status, superseded_by: supersededBy };
}

describe("documentation metadata governance", () => {
  it("publishes the closed status vocabulary", () => {
    expect(DOCUMENT_STATUSES).toEqual([
      "accepted",
      "draft",
      "superseded",
      "proposed",
      "completed",
    ]);
    expect(Object.isFrozen(DOCUMENT_STATUSES)).toBe(true);
  });

  it("rejects unknown document statuses", () => {
    expect(validateDocumentationMetadata("docs/ui/EXAMPLE.md", metadata("active"))).toEqual([
      "docs/ui/EXAMPLE.md: status must be one of accepted, draft, superseded, proposed, completed",
    ]);
  });

  it.each(["active", "draft", "accepted", "proposed"])(
    "rejects %s for a superpowers implementation plan",
    (status) => {
      expect(
        validateDocumentationMetadata(
          "docs/superpowers/plans/2026-07-28-example.md",
          metadata(status),
        ),
      ).toContain(
        "docs/superpowers/plans/2026-07-28-example.md: superpowers plans must be completed or superseded",
      );
    },
  );

  it("allows completed and explicitly superseded superpowers plans", () => {
    expect(
      validateDocumentationMetadata(
        "docs/superpowers/plans/2026-07-28-current.md",
        metadata("completed"),
      ),
    ).toEqual([]);
    expect(
      validateDocumentationMetadata(
        "docs/superpowers/plans/2026-07-18-old.md",
        metadata("superseded", "docs/superpowers/plans/2026-07-28-current.md"),
      ),
    ).toEqual([]);
  });

  it.each(["draft", "completed"])("rejects %s for a numbered ADR", (status) => {
    expect(
      validateDocumentationMetadata(
        "docs/adr/ADR-021-example-decision.md",
        metadata(status),
      ),
    ).toContain(
      "docs/adr/ADR-021-example-decision.md: numbered ADR status must be accepted, proposed or superseded",
    );
  });

  it("requires superseded_by only for superseded documents", () => {
    expect(
      validateDocumentationMetadata("docs/plans/OLD.md", metadata("superseded")),
    ).toContain("docs/plans/OLD.md: superseded documents require superseded_by");
    expect(
      validateDocumentationMetadata(
        "docs/plans/CURRENT.md",
        metadata("completed", "docs/plans/NEXT.md"),
      ),
    ).toContain("docs/plans/CURRENT.md: superseded_by is only valid when status is superseded");
  });

  it("validates supersession targets without inventing a workflow graph", () => {
    expect(
      validateSupersessionTargets([
        {
          file: "docs/plans/OLD.md",
          status: "superseded",
          supersededBy: "docs/plans/MISSING.md",
        },
        { file: "docs/plans/CURRENT.md", status: "completed" },
      ]),
    ).toEqual(["docs/plans/OLD.md: unknown superseded_by docs/plans/MISSING.md"]);

    expect(
      validateSupersessionTargets([
        {
          file: "docs/plans/SELF.md",
          status: "superseded",
          supersededBy: "docs/plans/SELF.md",
        },
      ]),
    ).toEqual(["docs/plans/SELF.md: superseded_by cannot reference the same document"]);
  });
});
