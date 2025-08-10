"use client";

import coffeeData from "@/../public/coffee_mapdata.json";
import { GoogleMap } from "@/components/home/google-map";
import { MapPin } from "@/components/map-pin";
import { RestaurantsContent } from "@/components/restaurants/restaurants-content";
import { Button } from "@/components/ui/button";
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
import { ChevronUp, Loader2, MapPin as MapPinIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { FabActions } from "../fab-actions";
import { WalletComponents } from "../wallet-connect-button";

export default function HomePage() {
  const restaurants: Restaurant[] = coffeeData.locations as Restaurant[];
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationPermission, setLocationPermission] = useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown");
  const [locationError, setLocationError] = useState<string | null>(null);

  // Function to request location access
  const requestLocationAccess = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationPermission("granted");
          setLocationError(null);
        },
        (error) => {
          console.error("Error getting user location:", error);
          setLocationPermission("denied");

          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError(
                "Location access denied. Please enable location permissions in your browser settings."
              );
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError("Location information is unavailable.");
              break;
            case error.TIMEOUT:
              setLocationError("Location request timed out.");
              break;
            default:
              setLocationError(
                "An unknown error occurred while retrieving location."
              );
              break;
          }

          // Fallback to San Francisco if geolocation fails
          setUserLocation({ lat: 37.7749, lng: -122.4194 });
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      // Fallback if geolocation is not supported
      setUserLocation({ lat: 37.7749, lng: -122.4194 });
    }
  };

  // Check location permission on component mount
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setLocationPermission(result.state);
        if (result.state === "granted") {
          requestLocationAccess();
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
      {locationPermission !== "granted" && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPinIcon className="h-4 w-4" />
              <span className="text-sm">
                {locationError ||
                  "Enable location access for better restaurant recommendations"}
              </span>
            </div>

            {locationPermission === "prompt" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={requestLocationAccess}
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                Allow Location
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
          >
            <div className="flex flex-col h-full">
              {/* Handle bar */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>

              <SheetHeader className="px-4 pb-2">
                <SheetTitle className="flex items-center justify-between gap-2">
                  <h1 className="text-xl">Restaurants Near You</h1>
                  <WalletComponents />
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
