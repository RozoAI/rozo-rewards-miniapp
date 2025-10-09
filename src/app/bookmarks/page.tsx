"use client";

import { PageHeader } from "@/components/page-header";
import { BookmarkCard } from "@/components/restaurants/BookmarkCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { Restaurant } from "@/types/restaurant";
import { Bookmark, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BookmarksPage() {
  const { bookmarks, getBookmarkedRestaurants } = useBookmarks();
  const router = useRouter();
  const [bookmarkedRestaurants, setBookmarkedRestaurants] = useState<
    Restaurant[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      const restaurants = getBookmarkedRestaurants();
      setBookmarkedRestaurants(restaurants);
    } catch (error) {
      console.error("Error loading bookmarked restaurants:", error);
    } finally {
      setLoading(false);
    }
  }, [bookmarks, getBookmarkedRestaurants]);

  if (loading) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <PageHeader title="My Bookmarks" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="size-12 sm:size-14 rounded-lg bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <PageHeader title="My Bookmarks" />
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Bookmark className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No bookmarks yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Start exploring restaurants and bookmark your favorites to see
              them here.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push("/lifestyle")}
                variant="default"
              >
                <Heart className="mr-2 h-4 w-4" />
                Explore Restaurants
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
      <PageHeader title="My Bookmarks" />

      <div className="space-y-4">
        {bookmarkedRestaurants.map((restaurant) => (
          <BookmarkCard key={restaurant._id} restaurant={restaurant} />
        ))}
      </div>

      {bookmarkedRestaurants.length > 0 && (
        <Card className="w-full">
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Want to discover more restaurants?
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={() => router.push("/lifestyle")}
                variant="outline"
                size="sm"
              >
                <Heart className="mr-2 h-4 w-4" />
                Explore More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
