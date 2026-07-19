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
  posthog.init(POSTHOG_KEY, {
    // Route all PostHog traffic through our own domain to bypass
    // MetaMask WebView and ad-blocker restrictions on analytics domains.
    api_host: "/api/posthog",
    // Keep direct host for PostHog UI links (feature flags, session replay, etc.)
    ui_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Auto-capture unhandled JS errors and promise rejections as $exception
    // events (does not capture console.error). Mirrors rozo-invoice#31.
    capture_exceptions: true,
  });
  posthog.register({ app_name: "rozo-rewards-miniapp" });
}
