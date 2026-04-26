"use client";

import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { cn, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { VISIBLE_HANDLES } from "@/shared";
import { useAppKitAccount } from "@reown/appkit/react";
import { Globe, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export interface DappRestaurant {
  _id: string;
  name: string;
  handle: string;
  currency?: string;
  formatted: string;
  logo_url: string;
  cashback_rate: number;
  price: string;
}

interface AiServiceItem {
  id: string;
  name: string;
  description: string;
  price_usd: number | null;
  logoUrl: string;
}

type FilterRegion = "worldwide" | "united-states" | "ai-services" | null;

export interface DappContentProps {
  /** JSON with `{ locations: DappRestaurant[] }`. Defaults to `/coffee_mapdata.json`. */
  dataUrl?: string;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  isDapp?: boolean;
}

export function DappContent({
  dataUrl = "/coffee_mapdata.json",
  className,
  title = "DApps",
  icon = <Globe className="size-6" />,
  isDapp = false,
}: DappContentProps) {
  const [restaurants, setRestaurants] = useState<DappRestaurant[]>([]);
  const [aiServices, setAiServices] = useState<AiServiceItem[]>([]);
  const [filter, setFilter] = useState<FilterRegion>(null);
  const [loading, setLoading] = useState(true);

  const { walletAddress, isConnected: isRozoWalletConnected } = useRozoWallet();
  const { address, isConnected } = useAppKitAccount();

  const activeAddress =
    (isRozoWalletConnected && walletAddress) || (isConnected && address) || "";

  useEffect(() => {
    setLoading(true);

    Promise.allSettled([
      fetch(dataUrl).then((res) => res.json()),
      fetch("/ai-services/services.json").then((res) => res.json()),
    ])
      .then(([dappResult, aiServicesResult]) => {
        if (dappResult.status === "fulfilled") {
          const dappData = dappResult.value;
          const locations: DappRestaurant[] = dappData.locations || [];
          setRestaurants(
            locations.filter((location) =>
              VISIBLE_HANDLES.includes(location.handle),
            ),
          );
        } else {
          setRestaurants([]);
        }

        if (aiServicesResult.status === "fulfilled") {
          const aiServicesData = aiServicesResult.value;
          setAiServices(Array.isArray(aiServicesData) ? aiServicesData : []);
        } else {
          setAiServices([]);
        }
      })
      .catch(() => {
        setRestaurants([]);
        setAiServices([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dataUrl]);

  const filtered = useMemo(() => {
    if (!filter) {
      return restaurants;
    }

    if (filter === "united-states") {
      return restaurants.filter(
        (r) => !r.currency && r.formatted.includes("United States"),
      );
    }

    if (filter === "worldwide") {
      return restaurants;
    }

    return restaurants;
  }, [restaurants, filter]);

  const renderRestaurantItem = (restaurant: DappRestaurant) => {
    const initials = getFirstTwoWordInitialsFromName(restaurant.name);

    return (
      <li key={restaurant._id}>
        <Link
          href={`/restaurant/${restaurant._id}?dapp=${isDapp}`}
          className={cn(
            "flex items-start gap-3 px-4 py-4",
            "hover:bg-muted/50 transition-colors",
            "active:bg-muted",
          )}
        >
          <Avatar className="size-12 rounded-lg ring-1 ring-border bg-muted shrink-0">
            <AvatarImage src={restaurant.logo_url} alt={restaurant.name} />
            <AvatarFallback className="rounded-lg font-medium text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-emerald-600 font-medium">
                {restaurant.cashback_rate}% cashback
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {restaurant.price}
              </span>
            </div>
          </div>
        </Link>
      </li>
    );
  };

  const renderAiServiceItem = (service: AiServiceItem) => {
    const priceLabel =
      service.price_usd === null ? "N/A" : `$${service.price_usd}`;
    const initials = getFirstTwoWordInitialsFromName(service.name);

    return (
      <li key={service.id}>
        <Link
          href={`/ai-services/${encodeURIComponent(service.id)}`}
          className={cn(
            "flex items-start gap-3 px-4 py-4",
            "transition-colors duration-200 hover:bg-muted/40",
          )}
        >
          <Avatar className="size-12 shrink-0">
            <AvatarImage src={service.logoUrl} alt={`${service.name} logo`} />
            <AvatarFallback className="rounded-md text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground truncate leading-tight">
                {service.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </div>
            <span className="mb-auto shrink-0 font-semibold text-foreground">
              {priceLabel}
            </span>
          </div>
        </Link>
      </li>
    );
  };

  return (
    <div className={cn("w-full flex flex-col gap-4 mt-4 mb-20", className)}>
      <PageHeader
        title={title}
        icon={icon}
        paymentHistoryAddress={activeAddress}
      />

      <div className="px-4 sm:px-0">
        <div className="flex gap-2 overflow-x-auto sm:overflow-visible">
          <Button
            variant={filter === "worldwide" ? "default" : "outline"}
            size="sm"
            className="flex-1 sm:flex-none justify-start"
            onClick={() => setFilter("worldwide")}
          >
            <span className="">🌍</span>
            <span>Worldwide</span>
          </Button>
          <Button
            variant={filter === "ai-services" ? "default" : "outline"}
            size="sm"
            className="flex-1 sm:flex-none justify-start"
            onClick={() => setFilter("ai-services")}
          >
            <Sparkles className="size-4  text-yellow-500" />
            <span>AI Services</span>
          </Button>
          <Button
            variant={filter === "united-states" ? "default" : "outline"}
            size="sm"
            className="flex-1 sm:flex-none justify-start"
            onClick={() => setFilter("united-states")}
          >
            <span className="">🇺🇸</span>
            <span>United States</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="px-4 sm:px-0">
          <ul className="divide-y rounded-md border">
            {Array.from({ length: 3 }).map((_, idx) => (
              <li key={idx} className="flex items-start gap-3 px-4 py-4">
                <div className="size-12 rounded-lg bg-muted animate-pulse ring-1 ring-border shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 max-w-48 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-full max-w-64 rounded bg-muted animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="px-4 sm:px-0">
          <ul className="divide-y rounded-md border bg-card">
            {filter === "ai-services"
              ? [...aiServices]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(renderAiServiceItem)
              : filtered.map(renderRestaurantItem)}
          </ul>

          {filter !== "ai-services" && filtered.length === 0 && (
            <div className="text-center py-8 px-4">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Coming soon
              </h3>
              <p className="text-muted-foreground">
                Try changing the filter region.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
