"use client";

import { useGeolocation } from "@/hooks/useGeolocation";
import { calculateDistance } from "@/lib/utils";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin } from "lucide-react";
import React from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import data from "../../public/coffee_mapdata.json";

// Fix default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type LocationItem = {
  _id: string;
  name: string;
  formatted: string;
  address_line1: string;
  address_line2?: string;
  lat: number;
  lon: number;
  distance?: number;
};

interface FooterMapProps {
  className?: string;
}

export function FooterMap({ className }: FooterMapProps) {
  const [locations, setLocations] = React.useState<LocationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const {
    coordinates,
    loading: locationLoading,
    error: locationError,
  } = useGeolocation();

  // Load restaurant data
  React.useEffect(() => {
    let isMounted = true;

    async function loadLocations() {
      try {
        // const res = await fetch("/coffee_mapdata.json");
        // if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        // const data = await res.json();
        if (!data || !Array.isArray(data.locations)) {
          throw new Error("Invalid data shape");
        }
        if (isMounted) {
          setLocations(data.locations);
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

  if (loading || locationLoading) {
    return (
      <div
        className={`h-64 rounded-lg border bg-muted flex items-center justify-center ${
          className || ""
        }`}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  if (error || locationError || !coordinates) {
    return (
      <div
        className={`h-64 rounded-lg border bg-muted flex items-center justify-center ${
          className || ""
        }`}
      >
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {error || locationError || "Unable to load map"}
          </p>
          <p className="text-xs mt-1">
            Location access required to show nearby shops
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-64 rounded-lg overflow-hidden border ${className || ""}`}
    >
      <MapContainer
        center={[coordinates.latitude, coordinates.longitude]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location marker */}
        <Marker
          position={[coordinates.latitude, coordinates.longitude]}
          icon={L.divIcon({
            className: "custom-user-marker",
            html: '<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })}
        >
          <Popup>
            <div className="text-center">
              <strong>Your Location</strong>
            </div>
          </Popup>
        </Marker>

        {/* Nearby restaurant markers */}
        {nearbyLocations.map((location) => (
          <Marker key={location._id} position={[location.lat, location.lon]}>
            <Popup>
              <div className="text-center min-w-0">
                <strong className="block font-semibold text-sm">
                  {location.name}
                </strong>
                <p className="text-xs text-gray-600 mt-1 leading-tight">
                  {location.address_line1}
                </p>
                {location.address_line2 && (
                  <p className="text-xs text-gray-600 leading-tight">
                    {location.address_line2}
                  </p>
                )}
                <p className="text-xs font-medium text-blue-600 mt-2">
                  {location.distance?.toFixed(1)} miles away
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Location count indicator */}
      {nearbyLocations.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-700 shadow-sm z-10">
          {nearbyLocations.length} shop{nearbyLocations.length !== 1 ? "s" : ""}{" "}
          within 10 miles
        </div>
      )}
    </div>
  );
}
