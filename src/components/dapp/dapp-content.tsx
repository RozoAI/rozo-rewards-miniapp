"use client";

import { PageHeader } from "@/components/page-header";
import { RestaurantDappDetail } from "@/components/restaurant/restaurant-dapp-detail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { DAPP_EVENTS, REWARDS_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { cn, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { ChevronRight, Globe, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type DappRestaurant = Restaurant;

interface AiServiceItem {
  id: string;
  name: string;
  description: string;
  price_usd: number | null;
  original_price_usd?: number | null;
  logoUrl: string;
}

type FilterRegion = "network-schools" | "united-states" | "ai-services" | null;
const FILTER_REGIONS = [
  "network-schools",
  "united-states",
  "ai-services",
] as const;

const isFilterRegion = (
  value: string | null,
): value is (typeof FILTER_REGIONS)[number] =>
  value !== null &&
  FILTER_REGIONS.includes(value as (typeof FILTER_REGIONS)[number]);

export interface DappContentProps {
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  isDapp?: boolean;
  restaurants: DappRestaurant[];
  aiServices: AiServiceItem[];
  /** EVM address from AppKit, supplied by discovery-mode wrapper. */
  evmAddress?: string;
  evmConnected?: boolean;
}

export function DappContent({
  className,
  title = "Merchants",
  icon = <Globe className="size-6" />,
  isDapp = false,
  restaurants,
  aiServices,
  evmAddress,
  evmConnected = false,
}: DappContentProps) {
  const [searchValue, setSearchValue] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const filter: FilterRegion =
    isFilterRegion(typeParam) && !(isDapp && typeParam === "ai-services")
      ? typeParam
      : "network-schools";

  const { walletAddress, isConnected: isRozoWalletConnected } = useRozoWallet();

  const activeAddress =
    (isRozoWalletConnected && walletAddress) ||
    (evmConnected && evmAddress) ||
    "";

  const prevFilterRef = useRef<FilterRegion>(null);
  useEffect(() => {
    if (prevFilterRef.current === null) {
      prevFilterRef.current = filter;
      return;
    }
    if (prevFilterRef.current !== filter) {
      prevFilterRef.current = filter;
      capture(DAPP_EVENTS.DAPP_FILTER_CHANGED, { action: filter ?? "" });
      setSearchValue("");
    }
  }, [filter]);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (value.trim().length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        capture(DAPP_EVENTS.DAPP_MERCHANT_SEARCHED, { action: value.trim() });
      }, 600);
    }
  };

  const setFilterInUrl = (nextFilter: Exclude<FilterRegion, null>) => {
    if (nextFilter === filter) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", nextFilter);
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const normalizedSearchValue = searchValue.trim().toLowerCase();

  const filteredRestaurants = useMemo(() => {
    if (!filter) {
      return restaurants;
    }

    if (filter === "united-states") {
      return restaurants.filter(
        (r) => !r.currency && r.formatted.includes("United States"),
      );
    }

    if (filter === "network-schools") {
      return restaurants;
    }

    return restaurants;
  }, [restaurants, filter]);

  const searchedRestaurants = useMemo(() => {
    if (!normalizedSearchValue) {
      return filteredRestaurants;
    }

    return filteredRestaurants.filter((restaurant) =>
      `${restaurant.name} ${restaurant.formatted} ${restaurant.handle}`
        .toLowerCase()
        .includes(normalizedSearchValue),
    );
  }, [filteredRestaurants, normalizedSearchValue]);

  const searchedAiServices = useMemo(() => {
    const sortedServices = [...aiServices].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    if (!normalizedSearchValue) {
      return sortedServices;
    }

    return sortedServices.filter((service) =>
      `${service.name} ${service.description}`
        .toLowerCase()
        .includes(normalizedSearchValue),
    );
  }, [aiServices, normalizedSearchValue]);

  const renderRestaurantItem = (restaurant: DappRestaurant) => {
    const initials = getFirstTwoWordInitialsFromName(restaurant.name);

    const itemContent = (
      <>
        <Avatar className="size-11 rounded-lg ring-1 ring-border bg-muted shrink-0">
          <AvatarImage src={restaurant.logo_url} alt={restaurant.name} />
          <AvatarFallback className="rounded-lg font-medium text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate text-sm leading-tight">
            {restaurant.name}
          </h3>
          {/* Hide this on dApp */}
          {!isDapp && (
            <>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                    {restaurant.cashback_rate}% Cashback
                  </span>
                </div>
                {restaurant.price && (
                  <span className="text-xs text-muted-foreground">
                    {restaurant.price}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        <ChevronRight className="size-4 text-muted-foreground shrink-0 self-center" />
      </>
    );

    const itemClassName = cn(
      "flex items-center gap-3 px-4 py-3.5 w-full text-left",
      "hover:bg-muted/50 active:bg-muted transition-colors duration-150",
    );

    return (
      <li key={restaurant._id}>
        {isDapp ? (
          <button
            type="button"
            onClick={() => {
              capture(REWARDS_EVENTS.MERCHANT_VIEWED, {
                merchant_id: restaurant._id,
                merchant_name: restaurant.name,
                category: "network_schools",
              });
              setSelectedRestaurant(restaurant);
            }}
            className={itemClassName}
          >
            {itemContent}
          </button>
        ) : (
          <Link href={`/ns/${restaurant.handle}`} className={itemClassName}>
            {itemContent}
          </Link>
        )}
      </li>
    );
  };

  const renderAiServiceItem = (service: AiServiceItem) => {
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
    const initials = getFirstTwoWordInitialsFromName(service.name);

    return (
      <li key={service.id}>
        <Link
          href={`/ai-services/${encodeURIComponent(service.id)}?dapp=${isDapp}`}
          className={cn(
            "flex items-center gap-3 px-4 py-3.5",
            "transition-colors duration-150 hover:bg-muted/50 active:bg-muted",
          )}
          onClick={() =>
            capture(REWARDS_EVENTS.MERCHANT_VIEWED, {
              merchant_id: service.id,
              merchant_name: service.name,
              category: "ai_services",
            })
          }
        >
          <Avatar className="size-11 rounded-lg ring-1 ring-border shrink-0">
            <AvatarImage src={service.logoUrl} alt={`${service.name} logo`} />
            <AvatarFallback className="rounded-lg text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-sm leading-tight truncate">
                  {service.name}
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {service.description}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {hasDiscount && (
                  <p className="text-[11px] text-muted-foreground line-through font-mono leading-tight">
                    ${service.original_price_usd}
                  </p>
                )}
                <p className="text-sm font-semibold text-foreground font-mono leading-tight">
                  {priceLabel}
                </p>
                {hasDiscount && discountPercent !== null && (
                  <Badge
                    variant="outline"
                    className="text-success border-success/30 bg-success/5 py-0 text-[10px] font-medium mt-0.5"
                  >
                    -{discountPercent}%
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        </Link>
      </li>
    );
  };

  if (isDapp && selectedRestaurant) {
    return (
      <RestaurantDappDetail
        restaurant={selectedRestaurant}
        onBack={() => setSelectedRestaurant(null)}
      />
    );
  }

  return (
    <div className={cn("w-full flex flex-col gap-4 mt-4 mb-20", className)}>
      <PageHeader
        title={title}
        icon={icon}
        paymentHistoryAddress={activeAddress}
      />

      <div className="px-4 sm:px-0">
        <div
          role="tablist"
          aria-label="Filter category"
          className="inline-flex w-full rounded-lg border border-border bg-muted p-1 gap-1"
        >
          <button
            role="tab"
            aria-selected={filter === "network-schools"}
            onClick={() => setFilterInUrl("network-schools")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
              filter === "network-schools"
                ? "bg-background text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <svg
              width="14"
              height="10"
              viewBox="0 0 30 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
              className="shrink-0"
            >
              <path
                d="M9.04883 0C14.4015 1.58136e-05 18.0466 0.857342 21.4111 0.857422C24.5739 0.857419 26.8592 0.730968 29.0273 0.478516C29.2469 0.453142 29.4413 0.621298 29.4414 0.838867V19.2832C29.4411 19.4516 29.323 19.5976 29.1543 19.626C27.6623 19.8749 24.1475 20 21.4111 20C18.4798 19.9999 14.1466 19.1426 9.55859 19.1426C5.14747 19.1426 2.72034 19.3956 0.432617 19.7822C0.207077 19.8203 0.000341557 19.6499 0 19.4248V1.0332C3.69636e-05 0.851129 0.136849 0.697243 0.320312 0.673828C2.56107 0.389876 5.35291 0 9.04883 0ZM13.4951 8.76074C11.9493 8.65328 10.6111 8.66895 9.43164 8.66895V11.1475C10.2548 11.1475 11.7426 11.1495 13.4922 11.2998C13.4903 13.3072 13.492 15.0743 13.5088 15.4326C14.1458 15.5754 14.5286 15.5754 15.791 15.8018V11.5508C17.549 11.7554 18.8433 11.8613 20.1377 11.8613V9.29004C18.7357 9.29004 17.6985 9.187 15.791 8.98242V4.79199C15.7758 4.78999 14.1434 4.57627 13.5088 4.57617C13.5086 4.61678 13.5007 6.53989 13.4951 8.76074Z"
                fill="currentColor"
              />
            </svg>
            Network Schools
          </button>
          {!isDapp && (
            <button
              role="tab"
              aria-selected={filter === "ai-services"}
              onClick={() => setFilterInUrl("ai-services")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                filter === "ai-services"
                  ? "bg-background text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sparkles className="size-3.5 shrink-0" />
              AI Services
            </button>
          )}
        </div>
      </div>

      {(filter === "ai-services"
        ? aiServices.length
        : filteredRestaurants.length) > 10 && (
        <div className="px-4 sm:px-0">
          <Input
            value={searchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={"Search..."}
            aria-label="Search list"
          />
        </div>
      )}

      <div className="px-4 sm:px-0">
        <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {filter === "ai-services"
            ? searchedAiServices.map(renderAiServiceItem)
            : searchedRestaurants.map(renderRestaurantItem)}
        </ul>

        {filter !== "ai-services" && searchedRestaurants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-border bg-card">
            <Globe className="size-8 text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Coming soon
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              Try changing the filter region.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
