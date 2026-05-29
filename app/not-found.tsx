import Link from "next/link";

import { getTranslations } from "next-intl/server";

import Logo from "./components/Logo";

import { cn } from "./lib/utils";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-4 py-16 text-center",
        "bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900",
      )}
    >
      <div className="flex flex-col items-center gap-6">
        <Logo size="xl" withBorder />

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
          <p className="text-zinc-400">{t("message")}</p>
        </div>

        <Link
          href="/"
          className={cn(
            "inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium text-white cursor-pointer",
            "bg-linear-to-r from-blue-600 to-blue-700",
            "transition-colors duration-200 ease-out",
            "hover:from-blue-700 hover:to-blue-800",
          )}
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
