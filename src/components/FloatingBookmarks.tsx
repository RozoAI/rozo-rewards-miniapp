"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { Bookmark, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function FloatingBookmarks() {
  const { bookmarks, getBookmarkedRestaurants, removeBookmark } =
    useBookmarks();
  const router = useRouter();
  const [bookmarkedRestaurants, setBookmarkedRestaurants] = useState<
    Restaurant[]
  >([]);

  useEffect(() => {
    const restaurants = getBookmarkedRestaurants();
    // Show only the first 4 bookmarks
    setBookmarkedRestaurants(restaurants.slice(0, 4));
  }, [bookmarks, getBookmarkedRestaurants]);

  const clearAllBookmarks = () => {
    bookmarks.forEach((bookmarkId) => {
      removeBookmark(bookmarkId);
    });
    toast.success("All bookmarks cleared");
  };

  // Don't render if no bookmarks
  if (bookmarks.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto">
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Bookmarks
            </span>
          </div>
          <Button
            onClick={clearAllBookmarks}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
            title="Clear all bookmarks"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {bookmarkedRestaurants.map((restaurant) => {
            const initials = getFirstTwoWordInitialsFromName(restaurant.name);

            return (
              <Link
                key={restaurant._id}
                href={`/restaurant/${restaurant._id}`}
                className="group"
                title={restaurant.name}
              >
                <div className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Avatar className="size-8 rounded-md ring-1 ring-border bg-muted">
                    <AvatarImage
                      src={restaurant.logo_url}
                      alt={restaurant.name}
                    />
                    <AvatarFallback
                      title={restaurant.name}
                      className="font-medium text-xs"
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {restaurant.name}
                  </span>
                </div>
              </Link>
            );
          })}

          {/* Show "Explore" item if less than 4 bookmarks */}
          {bookmarkedRestaurants.length < 4 && (
            <button
              onClick={() => router.push("/lifestyle")}
              className="group"
              title="Explore more restaurants"
            >
              <div className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="size-8 rounded-md ring-1 ring-border bg-muted flex items-center justify-center">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  Explore
                </span>
              </div>
            </button>
          )}

          {/* Fill remaining slots with empty spaces if needed */}
          {Array.from({
            length: Math.max(
              0,
              4 -
                bookmarkedRestaurants.length -
                (bookmarkedRestaurants.length < 4 ? 1 : 0)
            ),
          }).map((_, index) => (
            <div key={`empty-${index}`} className="size-8" />
          ))}
        </div>
      </div>
    </div>
  );
}
