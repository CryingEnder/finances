import { NextResponse } from "next/server";

import type { ApiErrorCode } from "./api-error-codes";
import type { ValidationErrorCode } from "./validation-error-codes";

export interface ApiErrorDetail {
  field: string;
  code: ValidationErrorCode;
}

export function apiError(
  errorCode: ApiErrorCode,
  status: number,
  details?: ApiErrorDetail[],
) {
  return NextResponse.json(
    {
      errorCode,
      ...(details && details.length > 0 ? { details } : {}),
    },
    { status },
  );
}
