"use client";

import { ListSearchInput } from "@/components/list-search-input";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useGeolocation } from "@/hooks/useGeolocation";
import { calculateDistance, cn } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { MapPin, RefreshCw, Search } from "lucide-react";
import * as React from "react";
import { RestaurantList } from "./restaurant-list";

export function RestaurantsContent({ className }: { className?: string }) {
  const [locations, setLocations] = React.useState<Restaurant[] | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  const {
    coordinates,
    loading: locationLoading,
    error: locationError,
    requestLocation,
  } = useGeolocation();

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await fetch("/coffee_mapdata.json");
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();

        if (!data || !Array.isArray(data.locations)) {
          throw new Error("Invalid data shape");
        }

        if (isMounted) setLocations(data.locations as Restaurant[]);
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

  const locationsWithDistance = React.useMemo(() => {
    if (!locations || !coordinates) return locations;

    return locations.map((location) => ({
      ...location,
      price: location.price || "",
      distance: calculateDistance(
        coordinates.latitude,
        coordinates.longitude,
        location.lat,
        location.lon
      ),
    }));
  }, [locations, coordinates]);

  const filteredAndSortedLocations = React.useMemo(() => {
    if (!locationsWithDistance) return null;

    let filtered = locationsWithDistance;

    // Filter by search query
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (q) {
      filtered = locationsWithDistance.filter(
        (location) =>
          location.name.toLowerCase().includes(q) ||
          location.formatted.toLowerCase().includes(q) ||
          location.address_line1.toLowerCase().includes(q) ||
          (location.address_line2 &&
            location.address_line2.toLowerCase().includes(q))
      );
    }

    // Sort by distance if location is available
    if (coordinates) {
      filtered = [...filtered].sort((a, b) => {
        const distanceA = a.distance ?? Infinity;
        const distanceB = b.distance ?? Infinity;
        return distanceA - distanceB;
      });
    }

    return filtered;
  }, [locationsWithDistance, debouncedSearchQuery, coordinates]);

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

  const hasResults =
    filteredAndSortedLocations && filteredAndSortedLocations.length > 0;
  const showNoResults =
    filteredAndSortedLocations &&
    filteredAndSortedLocations.length === 0 &&
    debouncedSearchQuery.trim();

  return (
    <div className={className}>
      {/* Location status */}
      {locationError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-800">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{locationError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={requestLocation}
            disabled={locationLoading}
            className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
          >
            <RefreshCw
              className={cn("h-3 w-3 mr-1", locationLoading && "animate-spin")}
            />
            Retry
          </Button>
        </div>
      )}

      {locationLoading && !coordinates && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-800">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Getting your location...</span>
        </div>
      )}

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
        hasResults && <RestaurantList locations={filteredAndSortedLocations!} />
      )}
    </div>
  );
}
