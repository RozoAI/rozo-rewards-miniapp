import { RestaurantList } from "@/components/restaurants/restaurant-list";
import { getAllRestaurants } from "@/lib/restaurants";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

// Network School aggregate landing page (/ns). Server-rendered so the copy and
// the merchant list are visible to crawlers — unlike /ns/{handle}, which renders
// its body client-side (ssr:false) and relies on metadata alone. This page
// targets "Network School crypto / payments / stablecoin" searches.
//
// This route lives at /ns; /ns/{handle} are the individual merchant pages.
export const metadata: Metadata = {
  title: "Pay with Crypto at Network School | Rozo",
  description:
    "Pay with stablecoins (USDC/USDT) at Network School merchants and earn cashback. Rozo powers crypto payments across NS Cafe, Rozo Studio, rides and more — serving the Network School (ns.com) community.",
  keywords: [
    "Network School",
    "Network School crypto",
    "Network School payments",
    "Network School stablecoin",
    "NS payments",
    "NS crypto",
    "NS Cafe",
    "pay with crypto Network School",
    "USDC payments",
    "USDT payments",
    "stablecoin payments",
    "crypto cashback",
    "Rozo",
    "ns.com",
  ],
  alternates: { canonical: "/ns" },
  openGraph: {
    title: "Pay with Crypto at Network School | Rozo",
    description:
      "Stablecoin payments and cashback at Network School merchants, powered by Rozo.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pay with Crypto at Network School | Rozo",
    description:
      "Stablecoin payments and cashback at Network School merchants, powered by Rozo.",
  },
};

export default function NetworkSchoolPage() {
  const merchants = getAllRestaurants();

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero */}
      <section className="relative px-5 pt-10 pb-8 flex flex-col gap-6">
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

        <div>
          <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-tight text-balance mb-3">
            Pay with crypto at
            <br />
            Network School.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
            Spend stablecoins (USDC and USDT) at{" "}
            <a
              href="https://ns.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Network School
            </a>{" "}
            merchants and earn up to{" "}
            <span className="font-mono font-medium text-foreground">10%</span>{" "}
            back in ROZO points. No card, no bank — just tap and pay in crypto.
          </p>
        </div>
      </section>

      <div className="h-px bg-border mx-5" />

      {/* Merchants */}
      <section className="px-5 py-6 flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-muted-foreground">
          Network School merchants
        </h2>

        <RestaurantList locations={merchants} />

        <Link
          href="/discovery"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          Discover more merchants <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* SEO body copy — server-rendered so crawlers read real content */}
      <section className="px-5 pb-10 flex flex-col gap-3 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-base font-semibold text-foreground">
          Crypto payments for the Network School community
        </h2>
        <p>
          Network School (ns.com) is a community of founders, builders and
          creators. Rozo lets you pay Network School merchants in stablecoins
          from any supported chain — USDC or USDT on Base, Ethereum, Solana,
          Stellar and more — and earn ROZO cashback on every purchase.
        </p>
        <p>
          Tap a merchant above to open its payment page, scan the QR code or copy
          the pay link, and settle in seconds. Merchants receive stablecoins
          directly; you keep custody of your funds until you pay.
        </p>
      </section>
    </div>
  );
}
