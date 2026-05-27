"use server";

import * as Sentry from "@sentry/nextjs";

import { revalidatePath } from "next/cache";

import { setSentryUser } from "../lib/capture-error";
import {
  generateJWT,
  setAuthCookie,
  authenticateUser,
  removeAuthCookie,
} from "../lib/auth";

export type LoginActionResult =
  | { success: true }
  | {
      success?: false;
      errorCode:
        | "missingFields"
        | "invalidCredentials"
        | "serviceUnavailable";
    };

export async function loginAction(
  formData: FormData,
): Promise<LoginActionResult> {
  return await Sentry.withServerActionInstrumentation(
    "loginAction",
    {
      formData,
      recordResponse: true,
    },
    async (): Promise<LoginActionResult> => {
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      if (!email || !password) {
        return {
          errorCode: "missingFields",
        };
      }

      const authResult = await authenticateUser({ email, password });

      if ("success" !== authResult.status) {
        return {
          errorCode:
            "serviceUnavailable" === authResult.status
              ? "serviceUnavailable"
              : "invalidCredentials",
        };
      }

      const token = generateJWT(authResult.user);
      await setAuthCookie(token);
      setSentryUser({
        id: authResult.user.id,
        name: authResult.user.name,
      });

      revalidatePath("/");
      return { success: true };
    },
  );
}

export async function logoutAction() {
  return await Sentry.withServerActionInstrumentation(
    "logoutAction",
    {
      recordResponse: true,
    },
    async () => {
      try {
        await removeAuthCookie();
      } catch {
        // Silence
      }

      revalidatePath("/");
      return { success: true };
    },
  );
}
