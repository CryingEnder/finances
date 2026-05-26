import type { ApiErrorCode } from "./api-error-codes";

export class ApiRequestError extends Error {
  readonly code: ApiErrorCode;
  readonly validationCode?: string;

  constructor(code: ApiErrorCode, validationCode?: string) {
    super(code);
    this.name = "ApiRequestError";
    this.code = code;
    this.validationCode = validationCode;
  }
}
