import { LandingAppStoreSection } from "@/components/landing/landing-app-store-section";
import { RozoOgNotice } from "@/components/landing/rozo-og-notice";
import { getAllRestaurants } from "@/lib/restaurants";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  const nsCafe = getAllRestaurants().find((r) => r.handle === "nscafe");

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero */}
      <section className="relative px-5 pt-10 pb-8 flex flex-col gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Rozo"
            width={26}
            height={26}
            priority
            className="rounded-md"
          />
          <span className="-ml-1 text-lg font-bold uppercase">ROZO</span>
        </div>

        {/* Headline */}
        <div>
          <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-tight text-balance mb-3">
            Spend stablecoins.
            <br />
            Earn cashback.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
            Pay at partner merchants with USDC and get up to{" "}
            <span className="font-mono font-medium text-foreground">10%</span>{" "}
            back in ROZO points.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-border mx-5" />

      {/* Merchants */}
      <section className="px-5 py-6 flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-muted-foreground">
          Featured Merchant
        </h2>

        {nsCafe && (
          <Link
            href={`/ns/${nsCafe.handle}`}
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-border-strong transition-colors group"
          >
            <div className="size-12 rounded-xl border border-border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
              {nsCafe.logo_url ? (
                <Image
                  src={nsCafe.logo_url}
                  alt={nsCafe.name}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              ) : (
                <span className="text-base font-semibold text-muted-foreground">
                  {nsCafe.name[0]}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{nsCafe.name}</p>
              <p className="text-xs text-muted-foreground">
                {nsCafe.address_line1}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                  {nsCafe.cashback_rate}% Cashback
                </span>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </Link>
        )}

        <Link
          href="/discovery"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          Discover more <ArrowRight className="size-4" />
        </Link>

        {/* ROZO OG announcement */}
        <RozoOgNotice />
      </section>

      <LandingAppStoreSection />

      {/* Footer */}
      <div className="mt-auto px-5 py-6 border-t border-border">
        <div className="flex justify-center items-center gap-3">
          <a
            href="https://x.com/rozoai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="X (Twitter)"
          >
            {/* X / Twitter */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://discord.com/invite/EfWejgTbuU"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Discord"
          >
            {/* Discord */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </a>
          <a
            href="https://t.me/shawnmuggle"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Telegram"
          >
            {/* Telegram */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
