"use client";

import { PageHeader } from "@/components/page-header";
import { RestaurantDappDetail } from "@/components/restaurant/restaurant-dapp-detail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { DAPP_EVENTS, REWARDS_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { cn, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { Globe, Sparkles } from "lucide-react";
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
  title = "DApps",
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
  const filter: FilterRegion = isFilterRegion(typeParam)
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
      </>
    );

    const itemClassName = cn(
      "flex items-start gap-3 px-4 py-4 w-full text-left",
      "hover:bg-muted/50 transition-colors",
      "active:bg-muted",
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
          <Link
            href={`/restaurant/${restaurant._id}`}
            className={itemClassName}
          >
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
            "flex items-start gap-3 px-4 py-4",
            "transition-colors duration-200 hover:bg-muted/40",
          )}
          onClick={() =>
            capture(REWARDS_EVENTS.MERCHANT_VIEWED, {
              merchant_id: service.id,
              merchant_name: service.name,
              category: "ai_services",
            })
          }
        >
          <Avatar className="size-12 shrink-0">
            <AvatarImage src={service.logoUrl} alt={`${service.name} logo`} />
            <AvatarFallback className="rounded-md text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground truncate leading-tight">
                {service.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </div>
            <div className="mb-auto shrink-0 text-right leading-tight">
              {hasDiscount && (
                <p className="text-[11px] text-muted-foreground line-through">
                  ${service.original_price_usd}
                </p>
              )}
              <p className="font-semibold text-foreground">{priceLabel}</p>
              {hasDiscount && discountPercent !== null && (
                <p className="text-[11px] font-medium text-emerald-600">
                  save {discountPercent}%
                </p>
              )}
            </div>
          </div>
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
        <div className="flex gap-2 overflow-x-auto sm:overflow-visible">
          <Button
            variant={filter === "network-schools" ? "default" : "outline"}
            size="sm"
            className="flex-1 sm:flex-none justify-start"
            onClick={() => setFilterInUrl("network-schools")}
          >
            <svg
              width="24"
              height="16"
              viewBox="0 0 30 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="size-4"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M9.04883 0C14.4015 1.58136e-05 18.0466 0.857342 21.4111 0.857422C24.5739 0.857419 26.8592 0.730968 29.0273 0.478516C29.2469 0.453142 29.4413 0.621298 29.4414 0.838867V19.2832C29.4411 19.4516 29.323 19.5976 29.1543 19.626C27.6623 19.8749 24.1475 20 21.4111 20C18.4798 19.9999 14.1466 19.1426 9.55859 19.1426C5.14747 19.1426 2.72034 19.3956 0.432617 19.7822C0.207077 19.8203 0.000341557 19.6499 0 19.4248V1.0332C3.69636e-05 0.851129 0.136849 0.697243 0.320312 0.673828C2.56107 0.389876 5.35291 0 9.04883 0ZM13.4951 8.76074C11.9493 8.65328 10.6111 8.66895 9.43164 8.66895V11.1475C10.2548 11.1475 11.7426 11.1495 13.4922 11.2998C13.4903 13.3072 13.492 15.0743 13.5088 15.4326C14.1458 15.5754 14.5286 15.5754 15.791 15.8018V11.5508C17.549 11.7554 18.8433 11.8613 20.1377 11.8613V9.29004C18.7357 9.29004 17.6985 9.187 15.791 8.98242V4.79199C15.7758 4.78999 14.1434 4.57627 13.5088 4.57617C13.5086 4.61678 13.5007 6.53989 13.4951 8.76074Z"
                fill="currentColor"
              ></path>
            </svg>

            <span>Network Schools</span>
          </Button>
          {!isDapp && (
            <Button
              variant={filter === "ai-services" ? "default" : "outline"}
              size="sm"
              className="flex-1 sm:flex-none justify-start"
              onClick={() => setFilterInUrl("ai-services")}
            >
              <Sparkles className="size-4  text-yellow-500" />
              <span>AI Services</span>
            </Button>
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
        <ul className="divide-y rounded-md border bg-card">
          {filter === "ai-services"
            ? searchedAiServices.map(renderAiServiceItem)
            : searchedRestaurants.map(renderRestaurantItem)}
        </ul>

        {filter !== "ai-services" && searchedRestaurants.length === 0 && (
          <div className="text-center py-8 px-4">
            <Globe className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Coming soon
            </h3>
            <p className="text-muted-foreground">
              Try changing the filter region.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
