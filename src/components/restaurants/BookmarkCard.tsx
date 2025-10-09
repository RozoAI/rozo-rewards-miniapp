"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { BadgePercent, Bookmark, MapPin } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface BookmarkCardProps {
  restaurant: Restaurant;
}

export function BookmarkCard({ restaurant }: BookmarkCardProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const initials = getFirstTwoWordInitialsFromName(restaurant.name);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(restaurant._id);
    toast.success(
      isBookmarked(restaurant._id)
        ? "Removed from bookmarks"
        : "Added to bookmarks"
    );
  };

  return (
    <Link href={`/restaurant/${restaurant._id}`} className="block">
      <Card className="w-full hover:shadow-md transition-shadow cursor-pointer gap-0">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="size-12 sm:size-14 rounded-lg ring-1 ring-border bg-muted flex-shrink-0">
              <AvatarImage src={restaurant.logo_url} alt={restaurant.name} />
              <AvatarFallback
                title={restaurant.name}
                className="font-medium text-sm"
              >
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <h3
                  className="text-lg sm:text-xl font-bold leading-tight line-clamp-2"
                  title={restaurant.name}
                >
                  {restaurant.name}
                </h3>
                <Button
                  onClick={handleBookmark}
                  variant={isBookmarked(restaurant._id) ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 ml-2"
                  title={
                    isBookmarked(restaurant._id)
                      ? "Remove from bookmarks"
                      : "Add to bookmarks"
                  }
                >
                  <Bookmark
                    className={`h-4 w-4 ${
                      isBookmarked(restaurant._id) ? "fill-current" : ""
                    }`}
                  />
                </Button>
              </div>

              <Link
                href={`https://maps.google.com/?q=${restaurant.lat},${restaurant.lon}`}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                className="flex items-start gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
              >
                <MapPin className="h-3 w-3 mt-0.5 shrink-0 group-hover:text-blue-600 transition-colors" />
                <div className="text-xs leading-relaxed group-hover:underline">
                  <p className="font-medium line-clamp-1">
                    {restaurant.address_line1}
                  </p>
                  {restaurant.address_line2 && (
                    <p className="line-clamp-1">{restaurant.address_line2}</p>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {restaurant.price && (
                <p className="text-xs text-muted-foreground">
                  Price: <span className="font-medium">{restaurant.price}</span>
                </p>
              )}
              {restaurant.cashback_rate > 0 && (
                <Badge
                  variant="default"
                  className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full"
                >
                  <BadgePercent className="size-3" />
                  {restaurant.cashback_rate}%
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
