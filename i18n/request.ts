import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { normalizeAppLocale } from "../app/lib/locale";

const COOKIE = "NEXT_LOCALE";

interface MessagesModule {
  default: Record<string, unknown>;
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = normalizeAppLocale(store.get(COOKIE)?.value);

  const mod = (await import(`../messages/${locale}.json`)) as MessagesModule;

  return {
    locale,
    messages: mod.default,
  };
});
