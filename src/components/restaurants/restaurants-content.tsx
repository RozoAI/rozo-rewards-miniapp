"use client";

import { ListSearchInput } from "@/components/list-search-input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import * as React from "react";
import { LocationItem, RestaurantList } from "./restaurant-list";

type CoffeeMapResponse = {
  locations: LocationItem[];
  status?: string;
};

export function RestaurantsContent({ className }: { className?: string }) {
  const [locations, setLocations] = React.useState<LocationItem[] | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await fetch("/coffee_mapdata.json");
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

  const filteredLocations = React.useMemo(() => {
    if (!locations) return null;
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(q) ||
        location.formatted.toLowerCase().includes(q) ||
        location.address_line1.toLowerCase().includes(q) ||
        (location.address_line2 &&
          location.address_line2.toLowerCase().includes(q))
    );
  }, [locations, debouncedSearchQuery]);

  const clearSearch = React.useCallback(() => setSearchQuery(""), []);

  if (errorMessage) {
    return (
      <div className={cn("p-4 text-sm text-red-600", className)}>
        {errorMessage}
      </div>
    );
  }

  if (!locations) {
    return (
      <div className={className}>
        <ListSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={clearSearch}
          placeholder="Search restaurants..."
        />
        <ul className={cn("divide-y rounded-md rounded-b-none")}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <li key={idx} className="flex items-start gap-3 px-4 py-4">
              <div className="size-12 sm:size-16 rounded-lg bg-muted animate-pulse ring-1 ring-border flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 max-w-48 rounded bg-muted animate-pulse" />
                <div className="h-3 w-full max-w-64 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 max-w-32 rounded bg-muted animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const hasResults = filteredLocations && filteredLocations.length > 0;
  const showNoResults =
    filteredLocations &&
    filteredLocations.length === 0 &&
    debouncedSearchQuery.trim();

  return (
    <div className={className}>
      <ListSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={clearSearch}
        placeholder="Search restaurants..."
      />
      {showNoResults ? (
        <div className="text-center py-8 px-4">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No restaurants found
          </h3>
          <p className="text-muted-foreground mb-4">
            No restaurants match your search for &quot;{debouncedSearchQuery}
            &quot;
          </p>
          <button
            onClick={clearSearch}
            className="text-primary hover:text-primary/80 font-medium"
          >
            Clear search
          </button>
        </div>
      ) : (
        hasResults && <RestaurantList locations={filteredLocations!} />
      )}
    </div>
  );
}
