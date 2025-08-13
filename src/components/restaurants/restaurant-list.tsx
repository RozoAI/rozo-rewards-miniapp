"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistance, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { BadgePercent, MapPin } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Badge } from "../ui/badge";

function ListRow({ location }: { location: Restaurant }) {
  const initials = getFirstTwoWordInitialsFromName(location.name);

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
            <div className="flex items-center gap-2">
              <h3
                className="text-base sm:text-lg font-semibold leading-tight"
                title={location.name}
              >
                {location.name}
              </h3>
            </div>
            {location.distance !== undefined && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground ml-2 flex-shrink-0">
                <MapPin className="h-3 w-3" />
                {formatDistance(location.distance)}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p
              className="text-sm text-muted-foreground line-clamp-2 leading-relaxed"
              title={location.formatted}
            >
              {location.formatted}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {location.price && (
              <p className="text-xs text-muted-foreground">
                Price: <b>{location.price}</b>
              </p>
            )}
            {location.cashback_rate > 0 && (
              <Badge
                variant="default"
                className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full"
              >
                <BadgePercent className="size-3" />
                Cashback: <b>{location.cashback_rate}%</b>
              </Badge>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

export const RestaurantList = React.memo(function RestaurantList({
  locations,
  className,
}: {
  locations: Restaurant[];
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
