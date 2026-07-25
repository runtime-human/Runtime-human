export const JANUARY_CONTENT_PROJECTION_ERROR_CODES = [
  "MISSING_CONTENT",
  "WRONG_KIND",
  "WRONG_CONTENT_TYPE",
  "INVALID_PAYLOAD",
  "REFERENCE_MISMATCH",
] as const;

export type JanuaryContentProjectionErrorCode =
  (typeof JANUARY_CONTENT_PROJECTION_ERROR_CODES)[number];

export class JanuaryContentProjectionError extends Error {
  readonly code: JanuaryContentProjectionErrorCode;
  readonly contentId: string;

  constructor(code: JanuaryContentProjectionErrorCode, contentId: string, message: string) {
    super(message);
    this.name = "JanuaryContentProjectionError";
    this.code = code;
    this.contentId = contentId;
  }
}
