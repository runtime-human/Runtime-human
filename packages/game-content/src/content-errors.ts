export const COMPILED_CONTENT_ERROR_CODES = [
  "INVALID_JSON",
  "INVALID_SHAPE",
  "INCOMPATIBLE_VERSION",
  "FINGERPRINT_MISMATCH",
  "MISSING_CHUNK",
  "UNEXPECTED_CHUNK",
  "DUPLICATE_CHUNK",
  "DESCRIPTOR_MISMATCH",
  "DUPLICATE_CONTENT_ID",
  "MISSING_REFERENCE",
  "CONTENT_NOT_FOUND",
] as const;

export type CompiledContentErrorCode = (typeof COMPILED_CONTENT_ERROR_CODES)[number];

export class CompiledContentError extends Error {
  readonly code: CompiledContentErrorCode;
  readonly details: Readonly<Record<string, string>>;

  constructor(
    code: CompiledContentErrorCode,
    message: string,
    details: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = "CompiledContentError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}
