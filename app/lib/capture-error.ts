import * as Sentry from "@sentry/nextjs";

interface CaptureContext {
  message: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: Sentry.SeverityLevel;
}

export function captureServerError(error: unknown, context: CaptureContext) {
  console.error(context.message, error);

  Sentry.withScope((scope) => {
    if (context.tags) {
      scope.setTags(context.tags);
    }

    if (context.extra) {
      scope.setExtras(context.extra);
    }

    if (context.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(error);
  });
}

export function captureClientError(error: unknown, context: CaptureContext) {
  console.error(context.message, error);

  Sentry.withScope((scope) => {
    if (context.tags) {
      scope.setTags(context.tags);
    }

    if (context.extra) {
      scope.setExtras(context.extra);
    }

    if (context.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(error);
  });
}

export function captureWarning(message: string, extra?: Record<string, unknown>) {
  console.warn(message, extra);

  Sentry.withScope((scope) => {
    scope.setLevel("warning");

    if (extra) {
      scope.setExtras(extra);
    }

    Sentry.captureMessage(message);
  });
}

export function setSentryUser(user: { id: string; name?: string }) {
  Sentry.setUser({
    id: user.id,
    username: user.name,
  });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}
