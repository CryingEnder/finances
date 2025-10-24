"use server";

import {
  authenticateUser,
  generateJWT,
  setAuthCookie,
  removeAuthCookie,
} from "../lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return {
      error: "Email and password are required",
    };
  }

  const user = await authenticateUser({ email, password });

  if (!user) {
    return {
      error: "Invalid email or password",
    };
  }

  const token = generateJWT(user);
  await setAuthCookie(token);

  revalidatePath("/");
  return { success: true };
}

export async function logoutAction() {
  try {
    await removeAuthCookie();
  } catch (error) {
    // Silence
  }

  revalidatePath("/");
  return { success: true };
}
