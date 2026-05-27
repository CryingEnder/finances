import * as Sentry from "@sentry/nextjs";

export async function register() {
  if ("nodejs" === process.env.NEXT_RUNTIME) {
    await import("./sentry.server.config");
  }

  if ("edge" === process.env.NEXT_RUNTIME) {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
