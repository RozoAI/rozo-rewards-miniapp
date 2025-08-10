"use client";

import {
  AdvancedMarker,
  APIProvider,
  Map,
  MapProps,
} from "@vis.gl/react-google-maps";
import { useState } from "react";
import { MapPin } from "../map-pin";

export function GoogleMap({
  defaultCenter,
  restaurants,
  mapProps,
}: {
  defaultCenter: { lat: number; lng: number };
  restaurants: any[];
  mapProps?: MapProps;
}) {
  const [, setIsMounted] = useState(false);

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
            typeof google !== "undefined"
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
            <div className="bg-blue-200/80 p-2 rounded-full">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}
