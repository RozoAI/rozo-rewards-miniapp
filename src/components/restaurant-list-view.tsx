"use client";

import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import Link from "next/link";

type LocationItem = {
  _id: string;
  name: string;
  formatted: string;
  address_line1: string;
  address_line2?: string;
  lat: number;
  lon: number;
};

type CoffeeMapResponse = {
  locations: LocationItem[];
  status?: string;
};

function ListRow({ location }: { location: LocationItem }) {
  const initials = getFirstTwoWordInitialsFromName(location.name);

  return (
    <li className="flex items-start gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors">
      <Avatar className="size-16 rounded-xl ring-1 ring-border bg-muted">
        <AvatarFallback title={location.name} className="font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold truncate" title={location.name}>
            {location.name}
          </h3>
        </div>
        <p
          className="text-sm text-muted-foreground line-clamp-1"
          title={location.formatted}
        >
          {location.formatted}
        </p>
        <Link
          href={`/restaurant/${location._id}`}
          className="text-xs text-primary line-clamp-1"
        >
          Click to view details
        </Link>
      </div>
    </li>
  );
}

export function RestaurantListView({ className }: { className?: string }) {
  const [locations, setLocations] = React.useState<LocationItem[] | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await fetch("/coffee_mapdata.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data: CoffeeMapResponse = await res.json();
        if (!data || !Array.isArray(data.locations)) {
          throw new Error("Invalid data shape");
        }
        if (isMounted) setLocations(data.locations);
      } catch (err) {
        if (isMounted)
          setErrorMessage(
            err instanceof Error ? err.message : "Unknown error loading data"
          );
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (errorMessage) {
    return (
      <div className={cn("p-4 text-sm text-red-600", className)}>
        {errorMessage}
      </div>
    );
  }

  if (!locations) {
    return (
      <ul className={cn("divide-y rounded-md rounded-b-none ", className)}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <li key={idx} className="flex items-start gap-4 px-4 py-3">
            <div className="size-16 rounded-xl bg-muted animate-pulse ring-1 ring-border" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-44 rounded bg-muted animate-pulse" />
              <div className="h-3 w-72 max-w-[70%] rounded bg-muted animate-pulse" />
              <div className="h-3 w-56 max-w-[60%] rounded bg-muted animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn("divide-y rounded-md rounded-b-none border", className)}>
      {locations.map((loc) => (
        <ListRow key={loc._id} location={loc} />
      ))}
    </ul>
  );
}
