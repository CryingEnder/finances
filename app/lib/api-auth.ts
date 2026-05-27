import { NextResponse } from "next/server";

import type { User } from "./types";

import { getCurrentUser } from "./auth";
import { apiError } from "./api-response";
import { setSentryUser } from "./capture-error";
import { API_ERROR_CODES } from "./api-error-codes";

interface ApiAuthSuccess { ok: true; user: User }
interface ApiAuthFailure { ok: false; response: NextResponse }

export async function requireApiAuth(): Promise<ApiAuthSuccess | ApiAuthFailure> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: apiError(API_ERROR_CODES.unauthorized, 401),
    };
  }

  setSentryUser({ id: user.id, name: user.name });
  return { ok: true, user };
}
