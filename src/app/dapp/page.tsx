"use client";

import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { Globe, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface Restaurant {
  _id: string;
  name: string;
  handle: string;
  currency?: string;
  formatted: string;
  logo_url: string;
  cashback_rate: number;
  price: string;
}

type FilterRegion = "worldwide" | "united-states" | "network-states" | null;

const RECENT_STORAGE_KEY = "rozo_dapp_recent_restaurants";
const MAX_RECENT_ITEMS = 5;

export default function DappPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filter, setFilter] = useState<FilterRegion>(null);
  const [loading, setLoading] = useState(true);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    fetch("/coffee_mapdata.json")
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data.locations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Hydrate recently used restaurants from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentIds(
            parsed.filter((id): id is string => typeof id === "string"),
          );
        }
      }
    } catch {
      // ignore malformed storage
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const handleRestaurantClick = (id: string) => {
    setRecentIds((prev) => {
      const next = [
        id,
        ...prev.filter((existingId) => existingId !== id),
      ].slice(0, MAX_RECENT_ITEMS);

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }

      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!filter) {
      return restaurants;
    }

    if (filter === "united-states") {
      return restaurants.filter(
        (r) => !r.currency && r.formatted.includes("United States"),
      );
    }

    if (filter === "network-states") {
      return restaurants.filter(
        (r) =>
          r.handle === "cafe" ||
          r.handle === "ride" ||
          r.handle === "paper" ||
          r.handle === "zen",
      );
    }

    // worldwide – everything that isn't a specific network-state-only handle
    if (filter === "worldwide") {
      return restaurants;
    }

    return restaurants;
  }, [restaurants, filter]);

  const recentRestaurants = useMemo(() => {
    if (!recentIds.length) return [];
    const byId = new Map(restaurants.map((r) => [r._id, r]));

    return recentIds
      .map((id) => byId.get(id))
      .filter((r): r is Restaurant => Boolean(r));
  }, [restaurants, recentIds]);

  const remainingRestaurants = useMemo(() => {
    if (!recentRestaurants.length) return filtered;
    const recentIdSet = new Set(recentRestaurants.map((r) => r._id));
    return filtered.filter((r) => !recentIdSet.has(r._id));
  }, [filtered, recentRestaurants]);

  const renderRestaurantItem = (restaurant: Restaurant) => {
    const initials = getFirstTwoWordInitialsFromName(restaurant.name);

    return (
      <li key={restaurant._id}>
        <Link
          href={`/restaurant/${restaurant._id}`}
          onClick={() => handleRestaurantClick(restaurant._id)}
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
            <div className="flex items-start gap-1 mt-0.5">
              <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground line-clamp-2">
                {restaurant.formatted}
              </p>
            </div>
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

  return (
    <div className="w-full flex flex-col gap-4 mt-4">
      <PageHeader title="DApps" icon={<Globe className="size-6" />} />

      <div className="px-4 sm:px-0">
        <div className="flex gap-2 overflow-x-auto sm:overflow-visible">
          <Button
            variant={filter === "worldwide" ? "default" : "outline"}
            size="sm"
            className="flex-1 sm:flex-none justify-start"
            onClick={() => setFilter("worldwide")}
          >
            <span className="mr-2">🌍</span>
            <span>Worldwide</span>
          </Button>
          <Button
            variant={filter === "united-states" ? "default" : "outline"}
            size="sm"
            className="flex-1 sm:flex-none justify-start"
            onClick={() => setFilter("united-states")}
          >
            <span className="mr-2">🇺🇸</span>
            <span>United States</span>
          </Button>
          <Button
            variant={filter === "network-states" ? "default" : "outline"}
            size="sm"
            className="flex-1 sm:flex-none justify-start"
            onClick={() => setFilter("network-states")}
          >
            <img
              src="https://ns.com/favicon.ico"
              alt="Rozo"
              width={16}
              height={16}
              className="rounded mr-2"
            />
            <span>Network States</span>
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
          {isHydrated && recentRestaurants.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">
                Recently used
              </div>
              <ul className="divide-y rounded-md border bg-card">
                {recentRestaurants.map(renderRestaurantItem)}
              </ul>
            </div>
          )}

          <ul className="divide-y rounded-md border bg-card">
            {remainingRestaurants.map(renderRestaurantItem)}
          </ul>

          {filtered.length === 0 && (
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
