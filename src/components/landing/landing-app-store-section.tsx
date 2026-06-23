"use client";

import { useIsInMiniApp } from "@coinbase/onchainkit/minikit";

export function LandingAppStoreSection() {
  const { isInMiniApp } = useIsInMiniApp();

  if (isInMiniApp !== false) return null;

  return (
    <section className="px-5 py-6 border-t border-border flex flex-col gap-3">
      <h2 className="text-xs font-semibold text-muted-foreground">
        Available on
      </h2>
      <div className="flex gap-3">
        <a
          href="https://apps.apple.com/id/app/rozo-wallet/id6754191938"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 flex-1 px-4 py-3 rounded-xl border border-border bg-card hover:border-border-strong transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="shrink-0"
          >
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground leading-none">
              Download on the
            </p>
            <p className="text-sm font-semibold leading-snug">App Store</p>
          </div>
        </a>
        <a
          href="https://play.google.com/store/apps/details?id=com.rozoapp&pcampaignid=web_share"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 flex-1 px-4 py-3 rounded-xl border border-border bg-card hover:border-border-strong transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="shrink-0"
          >
            <path d="M3.18 23.76c.3.17.64.22.99.14l12.45-7.2-2.78-2.78-10.66 9.84zM.4 1.4A1.49 1.49 0 0 0 0 2.43v19.14c0 .42.15.8.4 1.03l.06.06 10.72-10.72v-.25L.46 1.34.4 1.4zM20.67 10.35l-2.77-1.6-3.1 3.1 3.1 3.1 2.8-1.62c.8-.46.8-1.52-.03-1.98zM3.18.24L15.64 7.44l-2.78 2.78L2.2.38C2.5.3 2.88.07 3.18.24z" />
          </svg>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground leading-none">
              Get it on
            </p>
            <p className="text-sm font-semibold leading-snug">Google Play</p>
          </div>
        </a>
      </div>
    </section>
  );
}
