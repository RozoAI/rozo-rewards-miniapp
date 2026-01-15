"use client";

import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type FilterRegion = "worldwide" | "united-states" | "network-states";

export default function DappPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filter, setFilter] = useState<FilterRegion>("worldwide");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/coffee_mapdata.json")
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data.locations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "united-states")
      return restaurants.filter((r) => !r.currency);
    if (filter === "network-states")
      return restaurants.filter(
        (r) => r.handle === "cafe" || r.handle === "zen"
      );
    return restaurants;
  }, [restaurants, filter]);

  return (
    <div className="w-full flex flex-col gap-4 mt-4">
      <PageHeader title="DApps" icon={<Globe className="size-6" />} />

      <div className="px-4 sm:px-0">
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as FilterRegion)}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="worldwide">
              <div className="flex items-center gap-2">
                <span>🌍</span>
                <span>Worldwide</span>
              </div>
            </SelectItem>
            <SelectItem value="united-states">
              <div className="flex items-center gap-2">
                <span>🇺🇸</span>
                <span>United States</span>
              </div>
            </SelectItem>
            <SelectItem value="network-states">
              <div className="flex items-center gap-2">
                <img
                  src="https://ns.com/favicon.ico"
                  alt="Rozo"
                  width={16}
                  height={16}
                  className="rounded"
                />
                <span>Network States</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
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
            {filtered.map((restaurant) => {
              const initials = getFirstTwoWordInitialsFromName(restaurant.name);
              return (
                <li key={restaurant._id}>
                  <Link
                    href={`/restaurant/${restaurant._id}`}
                    className={cn(
                      "flex items-start gap-3 px-4 py-4",
                      "hover:bg-muted/50 transition-colors",
                      "active:bg-muted"
                    )}
                  >
                    <Avatar className="size-12 rounded-lg ring-1 ring-border bg-muted shrink-0">
                      <AvatarImage
                        src={restaurant.logo_url}
                        alt={restaurant.name}
                      />
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
            })}
          </ul>

          {filtered.length === 0 && (
            <div className="text-center py-8 px-4">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No restaurants found
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
