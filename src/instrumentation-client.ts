import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

Sentry.init({
  dsn: "https://8ac642e5ad82a5c8b1822051c5ddc8d2@o4507980213649408.ingest.us.sentry.io/4510859565268992",
  tracesSampleRate: 1,
  enableLogs: true,
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
if (POSTHOG_KEY) {
  console.log({ POSTHOG_KEY });
  posthog.init(POSTHOG_KEY, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  });
  posthog.register({ app_name: "rozo-rewards-miniapp" });
}
