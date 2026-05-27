import { NextResponse } from "next/server";

import { apiError } from "../../lib/api-response";
import { requireApiAuth } from "../../lib/api-auth";
import { getBnrExchangeRates } from "../../lib/bnr-rates";
import { API_ERROR_CODES } from "../../lib/api-error-codes";
import { captureServerError } from "../../lib/capture-error";

export async function GET() {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) {
      return auth.response;
    }
    const result = await getBnrExchangeRates();

    return NextResponse.json(result);
  } catch (error) {
    captureServerError(error, { message: "Error fetching exchange rates:" });
    return apiError(API_ERROR_CODES.failedFetchExchangeRates, 500);
  }
}
