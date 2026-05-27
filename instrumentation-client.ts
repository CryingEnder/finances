import {
  init,
  replayIntegration,
  captureRouterTransitionStart,
} from "@sentry/nextjs";

import { sentrySharedOptions } from "./sentry.shared.config";

init({
  ...sentrySharedOptions,
  integrations: [replayIntegration()],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
});

export const onRouterTransitionStart = captureRouterTransitionStart;
