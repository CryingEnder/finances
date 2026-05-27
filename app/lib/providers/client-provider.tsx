"use client";

import dynamic from "next/dynamic";
import * as Sentry from "@sentry/nextjs";

import { useState } from "react";
import {
  QueryCache,
  QueryClient,
  MutationCache,
  QueryClientProvider,
} from "@tanstack/react-query";

import { captureClientError } from "../capture-error";
import { ApiRequestError } from "../api-request-error";

const ReactQueryDevtools =
  "development" === process.env.NODE_ENV
    ? dynamic(
        () =>
          import("@tanstack/react-query-devtools").then(
            (mod) => mod.ReactQueryDevtools,
          ),
        { ssr: false },
      )
    : function QueryDevtoolsStub() {
        return null;
      };

function shouldReportQueryError(error: unknown): boolean {
  return !(error instanceof ApiRequestError);
}

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (!shouldReportQueryError(error)) {
              return;
            }

            captureClientError(error, {
              message: "React Query error",
              tags: {
                queryKey: JSON.stringify(query.queryKey),
              },
            });
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (!shouldReportQueryError(error)) {
              return;
            }

            captureClientError(error, {
              message: "React Query mutation error",
              tags: {
                mutationKey: JSON.stringify(mutation.options.mutationKey),
              },
            });
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export function setClientSentryUser(user: { id: string; name: string }) {
  Sentry.setUser({
    id: user.id,
    username: user.name,
  });
}
