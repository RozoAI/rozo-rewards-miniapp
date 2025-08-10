"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistance, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { MapPin } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export type LocationItem = {
  _id: string;
  name: string;
  formatted: string;
  address_line1: string;
  address_line2?: string;
  lat: number;
  lon: number;
  distance?: number; // Distance in miles
  logo_url: string;
  cashback_rate: number;
};

function ListRow({ location }: { location: LocationItem }) {
  const initials = getFirstTwoWordInitialsFromName(location.name);
  console.log(location);
  return (
    <li>
      <Link
        href={`/restaurant/${location._id}`}
        className="flex items-start gap-3 px-4 py-4 border-b !border-gray-400 last:border-b-0 hover:bg-accent/30 transition-colors"
      >
        <Avatar className="size-12 sm:size-16 rounded-lg ring-1 ring-border bg-muted flex-shrink-0">
          <AvatarImage src={location.logo_url} alt={location.name} />
          <AvatarFallback
            title={location.name}
            className="font-medium text-sm sm:text-base"
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between">
            <h3
              className="text-base sm:text-lg font-semibold leading-tight"
              title={location.name}
            >
              {location.name}
            </h3>
            {location.distance !== undefined && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground ml-2 flex-shrink-0">
                <MapPin className="h-3 w-3" />
                {formatDistance(location.distance)}
              </div>
            )}
          </div>
          <p
            className="text-sm text-muted-foreground line-clamp-2 leading-relaxed"
            title={location.formatted}
          >
            {location.formatted}
          </p>
        </div>
      </Link>
    </li>
  );
}

export const RestaurantList = React.memo(function RestaurantList({
  locations,
  className,
}: {
  locations: LocationItem[];
  className?: string;
}) {
  return (
    <ul
      className={
        "divide-y rounded-md rounded-b-none border " + (className ?? "")
      }
    >
      {locations.map((loc) => (
        <ListRow key={loc._id} location={loc} />
      ))}
    </ul>
  );
});
