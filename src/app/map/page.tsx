"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { calculateDistance, cn } from "@/lib/utils";
import { Coins, Loader2, MapPin, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import React from "react";

// Simple map component using dynamic import
const MapComponent = dynamic(
  () => import("@/components/simple-map").then((mod) => mod.SimpleMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full rounded-lg border bg-muted flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading map...</span>
        </div>
      </div>
    ),
  }
);

type LocationItem = {
  _id: string;
  name: string;
  formatted: string;
  address_line1: string;
  address_line2?: string;
  lat: number;
  lon: number;
  distance?: number;
  logo_url: string;
  cashback_rate: number;
};

export default function MapPage() {
  const [locations, setLocations] = React.useState<LocationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const {
    coordinates,
    loading: locationLoading,
    error: locationError,
    requestLocation,
  } = useGeolocation();

  // Load restaurant data
  React.useEffect(() => {
    let isMounted = true;

    async function loadLocations() {
      try {
        const res = await fetch("/coffee_mapdata.json");
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();

        if (!data || !Array.isArray(data.locations)) {
          throw new Error("Invalid data shape");
        }

        if (isMounted) {
          // Filter and process locations, providing fallback logo_url for null values
          const processedLocations = data.locations
            .filter(
              (loc: any): loc is LocationItem =>
                typeof loc._id === "string" &&
                typeof loc.name === "string" &&
                typeof loc.formatted === "string" &&
                typeof loc.address_line1 === "string" &&
                typeof loc.lat === "number" &&
                typeof loc.lon === "number" &&
                typeof loc.cashback_rate === "number"
            )
            .map((loc: any) => ({
              ...loc,
              logo_url: loc.logo_url || "/logo.png", // Fallback to default logo
            }));

          setLocations(processedLocations);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    }

    loadLocations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter locations within 10 miles
  const nearbyLocations = React.useMemo(() => {
    if (!coordinates || !locations.length) return [];

    return locations
      .map((location) => ({
        ...location,
        distance: calculateDistance(
          coordinates.latitude,
          coordinates.longitude,
          location.lat,
          location.lon
        ),
      }))
      .filter((location) => location.distance <= 10) // Within 10 miles
      .sort((a, b) => a.distance - b.distance); // Sort by distance
  }, [coordinates, locations]);

  if (loading) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <PageHeader
          title="Base Merchants Map"
          icon={<MapPin className="size-6" />}
        />
        <div className="h-96 rounded-lg border bg-muted flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading map...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <PageHeader
          title="Base Merchants Map"
          icon={<MapPin className="size-6" />}
        />
        <div className="h-96 rounded-lg border bg-muted flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Unable to load map</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4">
      <PageHeader
        title="Base Merchants Map"
        icon={<Coins className="size-6" />}
      />

      {/* Location status */}
      <div className="px-4">
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
                className={cn(
                  "h-3 w-3 mr-1",
                  locationLoading && "animate-spin"
                )}
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

        {coordinates && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-blue-800">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span className="text-sm">
                {nearbyLocations.length} Base merchant
                {nearbyLocations.length !== 1 ? "s" : ""} within 10 miles
              </span>
            </div>
            {nearbyLocations.length > 0 && (
              <span className="text-xs font-medium">
                Closest: {nearbyLocations[0]?.distance?.toFixed(1)}mi
              </span>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Map Legend</h4>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow"></div>
              <span className="text-gray-700">Your Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow flex items-center justify-center">
                <span className="text-white text-xs font-bold">B</span>
              </div>
              <span className="text-gray-700">Base Merchants</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map View */}
      {!locationError && coordinates ? (
        <div className="flex-1 min-h-[500px] relative mx-4 rounded-lg overflow-hidden border">
          <MapComponent
            center={[coordinates.latitude, coordinates.longitude]}
            locations={nearbyLocations}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-[400px] mx-4 rounded-lg border bg-muted flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Map Unavailable</p>
            <p className="text-sm mb-4">
              {locationError ||
                "Location access required to show nearby Base merchants"}
            </p>
            {locationError && (
              <Button
                variant="outline"
                onClick={requestLocation}
                disabled={locationLoading}
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4 mr-2",
                    locationLoading && "animate-spin"
                  )}
                />
                Try Again
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
