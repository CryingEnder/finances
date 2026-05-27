"use server";

import { revalidatePath } from "next/cache";

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

  revalidatePath("/");
  return { success: true };
}

export async function logoutAction() {
  try {
    await removeAuthCookie();
  } catch {
    // Silence
  }

  revalidatePath("/");
  return { success: true };
}
