"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import type { AppLocale } from "../lib/locale";

import { cn } from "../lib/utils";
import { setUserLocale } from "../actions/set-locale";

export default function LanguageToggle() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("Language");

  const select = (next: AppLocale) => {
    if (next === locale || pending) {
      return;
    }
    startTransition(() => {
      void (async () => {
        await setUserLocale(next);
        router.refresh();
      })();
    });
  };

  return (
    <div
      role="group"
      aria-label={t("aria")}
      className="inline-flex rounded-lg border border-zinc-600 bg-zinc-800/80 p-0.5"
    >
      {(["en", "ro"] as const).map((code) => (
        <button
          key={code}
          type="button"
          disabled={pending}
          onClick={() => {
            select(code);
          }}
          className={cn(
            "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            code === locale
              ? "bg-zinc-600 text-white"
              : "text-zinc-400 hover:text-white",
            pending && "opacity-60",
          )}
        >
          {t(code)}
        </button>
      ))}
    </div>
  );
}
