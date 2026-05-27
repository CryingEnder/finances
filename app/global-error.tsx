"use client";

import NextError from "next/error";
import * as Sentry from "@sentry/nextjs";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased min-h-screen bg-zinc-900 text-white">
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
