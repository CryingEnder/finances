"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import type { AppLocale } from "../lib/locale";

const COOKIE = "NEXT_LOCALE";

export async function setUserLocale(locale: AppLocale) {
  const jar = await cookies();
  jar.set(COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
