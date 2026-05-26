import { API_ERROR_CODES } from "../api-error-codes";
import { throwApiError } from "../extract-api-error";
import { ApiRequestError } from "../api-request-error";

export async function assertOkResponse(
  response: Response,
  fallbackCode: (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES],
): Promise<void> {
  if (response.ok) {
    return;
  }

  const errorData: unknown = await response.json().catch(() => null);
  throwApiError(errorData, fallbackCode);
}

export function throwInvalidPayload(): never {
  throw new ApiRequestError(API_ERROR_CODES.invalidPayload);
}

export function throwIdRequired(): never {
  throw new ApiRequestError(API_ERROR_CODES.idRequired);
}

export function throwNetworkError(): never {
  throw new ApiRequestError(API_ERROR_CODES.networkError);
}
