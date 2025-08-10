"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  MapProps,
} from "@vis.gl/react-google-maps";
import { BadgePercent } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MapPin } from "../map-pin";
import { Badge } from "../ui/badge";

export function GoogleMap({
  defaultCenter,
  restaurants,
  mapProps,
  selectedLocation,
}: {
  defaultCenter: { lat: number; lng: number };
  restaurants: Restaurant[];
  mapProps?: MapProps;
  selectedLocation?: { lat: number; lng: number };
}) {
  const [, setIsMounted] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  return (
    <APIProvider
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY as string}
      onLoad={() => {
        setIsMounted(true);
      }}
    >
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={12}
        mapId="ac70144e8f27638734b58d39"
        className="h-full w-full"
        disableDefaultUI={true}
        zoomControl={true}
        mapTypeControl={false}
        scaleControl={false}
        streetViewControl={false}
        rotateControl={false}
        fullscreenControl={false}
        zoomControlOptions={{
          position:
            typeof google !== "undefined" && google.maps?.ControlPosition
              ? google.maps.ControlPosition.TOP_RIGHT
              : undefined,
        }}
        {...mapProps}
      >
        {restaurants.map((restaurant) => (
          <AdvancedMarker
            key={restaurant._id}
            position={{ lat: restaurant.lat, lng: restaurant.lon }}
          >
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="bg-blue-200/80 p-2 rounded-full hover:bg-blue-300/80 transition-colors cursor-pointer"
                  onClick={() => setSelectedRestaurant(restaurant)}
                >
                  <MapPin className="h-5 w-5 text-blue-600" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="h-auto max-h-[60vh] rounded-t-3xl border-t-2 p-0"
              >
                <div className="flex flex-col">
                  {/* Handle bar */}
                  <div className="flex justify-center py-3">
                    <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                  </div>

                  <SheetHeader className="px-4 pb-2">
                    <SheetTitle className="text-left">
                      {restaurant.name}
                    </SheetTitle>
                  </SheetHeader>

                  <div className="px-4 pb-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-12 rounded-lg ring-1 ring-border bg-muted flex-shrink-0">
                        <AvatarImage
                          src={restaurant.logo_url}
                          alt={restaurant.name}
                        />
                        <AvatarFallback
                          title={restaurant.name}
                          className="font-medium text-sm"
                        >
                          {getFirstTwoWordInitialsFromName(restaurant.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-2">
                        {/* Address details */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>{restaurant.address_line1}</div>
                          {restaurant.address_line2 && (
                            <div>{restaurant.address_line2}</div>
                          )}
                        </div>

                        {/* Distance and price */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {restaurant.distance && (
                            <span>{restaurant.distance}km away</span>
                          )}
                        </div>

                        {/* Cashback rate */}
                        <div className="flex items-center gap-3">
                          {restaurant.price && (
                            <p className="text-xs text-muted-foreground">
                              Price: <b>{restaurant.price}</b>
                            </p>
                          )}
                          {restaurant.cashback_rate > 0 && (
                            <Badge
                              variant="default"
                              className="text-xs bg-green-100 text-green-800 rounded-full"
                            >
                              <BadgePercent className="size-3" />
                              Cashback: <b>{restaurant.cashback_rate}%</b>
                            </Badge>
                          )}
                        </div>

                        <Button asChild size="sm" className="w-full mt-3">
                          <Link href={`/restaurant/${restaurant._id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </AdvancedMarker>
        ))}

        {selectedLocation && <AdvancedMarker position={selectedLocation} />}
      </Map>
    </APIProvider>
  );
}
