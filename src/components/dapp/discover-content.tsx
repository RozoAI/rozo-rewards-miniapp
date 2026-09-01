"use client";

import { DappList } from "@/components/dapp/dapp-list";
import { PageHeader } from "@/components/page-header";
import { RestaurantDappDetail } from "@/components/restaurant/restaurant-dapp-detail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { DAPP_EVENTS, REWARDS_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { DAPPS } from "@/lib/dapps";
import { cn, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { ChevronRight, GlobeIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type DappRestaurant = Restaurant;

interface AiServiceItem {
  id: string;
  name: string;
  description: string;
  price_usd: number | null;
  original_price_usd?: number | null;
  logoUrl: string;
}

export interface DiscoverContentProps {
  className?: string;
  title?: string;
  aiServices: AiServiceItem[];
}

export function DiscoverContent({
  className,
  title = "Discover",
  aiServices,
}: DiscoverContentProps) {
  const searchParams = useSearchParams();
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<DappRestaurant | null>(null);
  const { walletAddress } = useRozoWallet();

  const osParam = searchParams.get("os");
  const os =
    osParam === "Android" || osParam === "iOS" ? osParam : null;

  useEffect(() => {
    if (os) {
      capture(DAPP_EVENTS.DAPP_OS_PARAM_DETECTED, { os });
    }
  }, [os]);

  if (selectedRestaurant) {
    return (
      <RestaurantDappDetail
        restaurant={selectedRestaurant}
        backTitle="Back to Discover"
        onBack={() => setSelectedRestaurant(null)}
      />
    );
  }

  return (
    <div className={cn("w-full flex flex-col gap-6 mt-4 mb-20", className)}>
      <PageHeader
        title={title}
        icon={<GlobeIcon className="size-6" />}
        paymentHistoryAddress={walletAddress ?? undefined}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground px-4 sm:px-0">
          dApps
        </h2>
        <div className="mx-4 sm:mx-0">
          <DappList dapps={DAPPS} />
        </div>
      </section>

      {os !== "iOS" && aiServices.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground px-4 sm:px-0">
            AI Services
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card mx-4 sm:mx-0 overflow-hidden">
            {aiServices.map((service) => {
              const initials = getFirstTwoWordInitialsFromName(service.name);
              const priceLabel =
                service.price_usd === null ? "N/A" : `$${service.price_usd}`;
              const hasDiscount =
                typeof service.price_usd === "number" &&
                typeof service.original_price_usd === "number" &&
                service.original_price_usd > service.price_usd;
              const discountPercent = hasDiscount
                ? Math.round(
                    ((service.original_price_usd! - service.price_usd!) /
                      service.original_price_usd!) *
                      100,
                  )
                : null;

              return (
                <li key={service.id}>
                  <Link
                    href={`/ai-services/${encodeURIComponent(service.id)}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors duration-150"
                    onClick={() =>
                      capture(REWARDS_EVENTS.MERCHANT_VIEWED, {
                        merchant_id: service.id,
                        merchant_name: service.name,
                        category: "ai_services",
                      })
                    }
                  >
                    <Avatar className="size-11 rounded-lg ring-1 ring-border bg-muted shrink-0">
                      <AvatarImage
                        src={service.logoUrl}
                        alt={`${service.name} logo`}
                      />
                      <AvatarFallback className="rounded-lg font-medium text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-sm leading-tight">
                        {service.name}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {service.description}
                      </p>
                    </div>
                    {hasDiscount && discountPercent !== null && (
                      <Badge
                        variant="outline"
                        className="text-success border-success/30 bg-success/5 text-[10px] font-medium shrink-0"
                      >
                        -{discountPercent}%
                      </Badge>
                    )}
                    <span className="text-sm font-semibold text-foreground font-mono shrink-0">
                      {priceLabel}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0 self-center" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
