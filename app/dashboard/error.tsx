"use client";

import * as Sentry from "@sentry/nextjs";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "../components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-900">
      <div className="max-w-md w-full rounded-2xl border border-zinc-700 bg-zinc-800/50 p-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">
          {t("dashboardTitle")}
        </h2>
        <p className="text-zinc-400 mb-6">{t("dashboardDescription")}</p>
        <Button onClick={reset} className="cursor-pointer">
          {t("tryAgain")}
        </Button>
      </div>
    </div>
  );
}
