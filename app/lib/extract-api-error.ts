import type { ValidationErrorCode } from "./validation-error-codes";

import { ApiRequestError } from "./api-request-error";
import {
  API_ERROR_CODES,
  type ApiErrorCode,
} from "./api-error-codes";

interface ApiErrorPayload {
  errorCode?: string;
  details?: { field?: string; code?: string }[];
}

const isApiErrorCode = (value: string): value is ApiErrorCode =>
  Object.values(API_ERROR_CODES).includes(value as ApiErrorCode);

const resolveApiErrorCode = (payload: ApiErrorPayload): ApiErrorCode | null => {
  if (
    "string" === typeof payload.errorCode &&
    isApiErrorCode(payload.errorCode)
  ) {
    return payload.errorCode;
  }

  return null;
};

const resolveValidationCode = (
  payload: ApiErrorPayload,
): ValidationErrorCode | undefined => {
  const code = payload.details?.[0]?.code;
  if ("string" === typeof code && code.length > 0) {
    return code as ValidationErrorCode;
  }

  return undefined;
};

export const parseApiErrorPayload = (
  payload: unknown,
  fallbackCode: ApiErrorCode,
): ApiRequestError => {
  if ("object" !== typeof payload || null === payload) {
    return new ApiRequestError(fallbackCode);
  }

  const errorPayload = payload as ApiErrorPayload;
  const code = resolveApiErrorCode(errorPayload) ?? fallbackCode;
  const validationCode = resolveValidationCode(errorPayload);

  return new ApiRequestError(code, validationCode);
};

export const throwApiError = (
  payload: unknown,
  fallbackCode: ApiErrorCode,
): never => {
  throw parseApiErrorPayload(payload, fallbackCode);
};
