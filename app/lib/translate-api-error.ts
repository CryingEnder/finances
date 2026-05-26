import type { ApiErrorCode } from "./api-error-codes";

import { ApiRequestError } from "./api-request-error";

type TranslateFn = (key: string) => string;

const translateCode = (
  code: ApiErrorCode,
  validationCode: string | undefined,
  tApi: TranslateFn,
  tValidation: TranslateFn,
  fallback: string,
): string => {
  if (validationCode && "validationFailed" === code) {
    try {
      return tValidation(validationCode);
    } catch {
      return fallback;
    }
  }

  try {
    return tApi(code);
  } catch {
    return fallback;
  }
};

export function translateApiError(
  error: unknown,
  tApi: TranslateFn,
  tValidation: TranslateFn,
  fallback: string,
): string {
  if (error instanceof ApiRequestError) {
    return translateCode(
      error.code,
      error.validationCode,
      tApi,
      tValidation,
      fallback,
    );
  }

  return fallback;
}

export function translateApiErrorCode(
  code: ApiErrorCode,
  tApi: TranslateFn,
  fallback: string,
): string {
  try {
    return tApi(code);
  } catch {
    return fallback;
  }
}
