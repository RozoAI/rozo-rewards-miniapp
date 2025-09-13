"use client";

import coffeeData from "@/../public/coffee_mapdata.json";
import { GoogleMap } from "@/components/home/google-map";
import { MapPin } from "@/components/map-pin";
import { RestaurantsContent } from "@/components/restaurants/restaurants-content";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { type Restaurant } from "@/types/restaurant";
import { ChevronUp, Loader2, MapPinIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { FabActions } from "../fab-actions";
import { Button } from "../ui/button";
import { WalletComponents } from "../wallet-connect-button";

export default function HomePage() {
  const restaurants: Restaurant[] = coffeeData.locations as Restaurant[];
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationPermission, setLocationPermission] = useState<
    "granted" | "denied" | "prompt" | "unknown" | "approximate" | "timeout"
  >("unknown");
  const [locationError, setLocationError] = useState<string | null>(null);

  // Detect Chrome on macOS
  const isChromeOnMacOS = () => {
    const ua = navigator.userAgent;
    return /Macintosh/.test(ua) && /Chrome\//.test(ua) && !/Edg\//.test(ua);
  };

  // IP-based fallback
  const fallbackToIPLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (!res.ok) throw new Error("IP location request failed");
      const data = await res.json();
      return { lat: data.latitude, lng: data.longitude };
    } catch (err) {
      console.error("IP-based fallback failed:", err);
      return { lat: 37.7749, lng: -122.4194 }; // San Francisco fallback
    }
  };

  const requestLocationAccess = async (forceGPS = false) => {
    // If Chrome on macOS and not forcing GPS, skip geolocation
    if (isChromeOnMacOS() && !forceGPS) {
      console.warn(
        "Detected Chrome on macOS — using IP fallback due to Core Location bug"
      );
      const ipLocation = await fallbackToIPLocation();
      setUserLocation(ipLocation);
      setLocationPermission("approximate");
      setLocationError("Using approximate location due to browser limitation.");
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationPermission("granted");
          setLocationError(null);
        },
        async (error) => {
          console.error("Error getting user location:", error);

          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationPermission("denied");
              setLocationError(
                "Location access denied. Please enable location permissions in your browser settings."
              );
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationPermission("approximate");
              setLocationError(
                "Location information is unavailable. Using approximate location."
              );
              const ipLocation = await fallbackToIPLocation();
              setUserLocation(ipLocation);
              return;
            case error.TIMEOUT:
              setLocationPermission("timeout");
              setLocationError("Location request timed out.");
              break;
            default:
              setLocationPermission("unknown");
              setLocationError(
                "An unknown error occurred while retrieving location."
              );
              break;
          }

          // Final fallback: San Francisco
          setUserLocation({ lat: 37.7749, lng: -122.4194 });
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      setUserLocation({ lat: 37.7749, lng: -122.4194 });
    }
  };

  // Check location permission on component mount
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setLocationPermission(result.state);
        if (result.state === "granted" || result.state === "prompt") {
          // Permission already granted; force GPS and skip fallbacks
          requestLocationAccess(true);
        } else {
          // Use fallback location if permission not granted
          setUserLocation({ lat: 37.7749, lng: -122.4194 });
        }
      });
    } else {
      // If permissions API is not available, try to get location directly
      setUserLocation({ lat: 37.7749, lng: -122.4194 });
    }
  }, []);

  // Use user location or fallback
  const defaultCenter = userLocation;

  if (!defaultCenter) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {/* Location permission banner */}
      {locationPermission !== "granted" && locationPermission !== "prompt" && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPinIcon className="h-4 w-4" />
              <span className="text-sm">
                {locationError ||
                  "Enable location access for better restaurant recommendations"}
              </span>
            </div>

            {locationPermission === "approximate" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => requestLocationAccess(true)}
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Full screen map */}
      {locationPermission === "granted" && (
        <GoogleMap
          defaultCenter={defaultCenter}
          restaurants={restaurants}
          selectedLocation={userLocation}
        />
      )}

      {/* Trigger card above bottom navbar */}
      <div className="absolute bottom-16 left-0 right-0 px-4 pb-4">
        <Sheet>
          <SheetTrigger asChild>
            <Card className="cursor-pointer rounded-t-2xl rounded-b-lg bg-card shadow-lg py-0 w-[calc(100%-84px)]">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {restaurants.length} restaurants nearby
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tap to view restaurants
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="h-[85vh] rounded-t-3xl border-t-2 p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex flex-col h-full">
              {/* Handle bar */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>

              <SheetHeader className="px-4 pb-2">
                <SheetTitle className="flex items-center justify-between gap-2">
                  <span className="text-xl">Restaurants Near You</span>
                  {/* <WalletComponents /> */}
                </SheetTitle>
                <p className="text-sm text-gray-500 text-left">
                  {restaurants.length} places found
                </p>
              </SheetHeader>

              <ScrollArea className="flex-1 py-3 h-[calc(100%-100px)] px-4">
                <RestaurantsContent className="mt-2" />
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <FabActions className="absolute" />

      <div className="absolute top-4 left-4">
        <WalletComponents />
      </div>
    </div>
  );
}
