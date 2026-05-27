import type { EventHint, ErrorEvent } from "@sentry/nextjs";

const SENSITIVE_KEYS = [
  "password",
  "token",
  "authorization",
  "cookie",
  "jwt",
  "secret",
  "mongodb_uri",
  "auth-token",
];

function scrubValue(key: string, value: unknown): unknown {
  const normalizedKey = key.toLowerCase();

  if (
    SENSITIVE_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey))
  ) {
    return "[Filtered]";
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => scrubValue(String(index), item));
  }

  if (value && "object" === typeof value) {
    return scrubObject(value as Record<string, unknown>);
  }

  return value;
}

function scrubObject(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, scrubValue(key, value)]),
  );
}

function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request?.headers) {
    event.request.headers = scrubObject(
      event.request.headers as Record<string, unknown>,
    ) as Record<string, string>;
  }

  if (event.request?.cookies) {
    event.request.cookies = scrubObject(
      event.request.cookies as Record<string, unknown>,
    ) as Record<string, string>;
  }

  if (event.extra) {
    event.extra = scrubObject(event.extra as Record<string, unknown>);
  }

  if (event.user?.email) {
    delete event.user.email;
  }

  return event;
}

export const sentrySharedOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment:
    process.env.SENTRY_ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV,
  sendDefaultPii: true,
  tracesSampleRate: "development" === process.env.NODE_ENV ? 1 : 0.1,
  enableLogs: true,
  beforeSend(event: ErrorEvent, _hint: EventHint) {
    return scrubEvent(event);
  },
} as const;
