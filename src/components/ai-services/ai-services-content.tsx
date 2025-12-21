"use client";

import { ListSearchInput } from "@/components/list-search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { Bookmark, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import data from "../../../public/ai_commerce_catalog.json";
import { AiServicesList, CatalogItem } from "./ai-services-list";

export function AiServicesContent({ className }: { className?: string }) {
  const { bookmarks, removeBookmark } = useBookmarks();
  const router = useRouter();
  const [items, setItems] = React.useState<CatalogItem[] | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  const clearAllBookmarks = () => {
    bookmarks.forEach((bookmark) => {
      removeBookmark(bookmark.id);
    });
    toast.success("All bookmarks cleared");
  };

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        if (!Array.isArray(data)) throw new Error("Invalid data shape");
        if (isMounted) {
          const filteredData = data.filter(
            (item) => item.discount_rate && item.discount_rate !== 0
          );

          // Add Rozo Banana as the first item
          const rozoBananaItem: CatalogItem = {
            domain: "b.rozo.ai",
            name: "Rozo Banana",
            price_in_usd: 20,
            original_value_usd: 20,
            duration_months: 0,
            destination: 0,
            category: "AI",
            description: "Unlock the creativity with Nano Banana x Base x402",
            offer_description: "AI-powered creative tools and services",
            logo_url: "banana.jpg",
            cashback_rate: 50,
            discount_rate: 0,
            savings_usd: 0,
            source: "https://b.rozo.ai/",
            sold_out: false,
          };

          // setItems([rozoBananaItem, ...filteredData]);
          setItems([...filteredData]);
        }
      } catch (err) {
        if (isMounted)
          setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = React.useMemo(() => {
    if (!items) return null;
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.domain.toLowerCase().includes(q)
    );
  }, [items, debouncedSearchQuery]);

  const clearSearch = React.useCallback(() => setSearchQuery(""), []);

  if (errorMessage) {
    return (
      <div className={cn("p-4 text-sm text-red-600", className)}>
        {errorMessage}
      </div>
    );
  }

  if (!items) {
    return (
      <div className={className}>
        {/* Show bookmarks grid if there are bookmarks, otherwise show search */}
        {bookmarks.length > 0 ? (
          <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 mb-4">
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
                <Trash className="h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {bookmarks.map((item) => {
                const initials = getFirstTwoWordInitialsFromName(item.title);

                return (
                  <Link
                    key={item.id}
                    href={item.url}
                    className="group"
                    title={item.title}
                  >
                    <div className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-muted/50 transition-colors border-2">
                      <Avatar className="size-8 rounded-md ring-1 ring-border bg-muted">
                        <AvatarImage src={item.logo_url} alt={item.title} />
                        <AvatarFallback
                          title={item.title}
                          className="font-medium text-xs"
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {item.title}
                      </span>
                    </div>
                  </Link>
                );
              })}

              {/* Show "Explore" item if less than 4 bookmarks */}
              {bookmarks.length < 4 && (
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
                  4 - bookmarks.length - (bookmarks.length < 4 ? 1 : 0)
                ),
              }).map((_, index) => (
                <div key={`empty-${index}`} className="size-8" />
              ))}
            </div>
          </div>
        ) : (
          <ListSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={clearSearch}
            placeholder="Search AI services..."
          />
        )}

        <div>
          <ul className={cn("divide-y rounded-md rounded-b-none")}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <li key={idx} className="flex items-start gap-3 px-4 py-4">
                <div className="size-12 sm:size-16 rounded-lg bg-muted animate-pulse ring-1 ring-border flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 max-w-48 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/2 max-w-32 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-full max-w-64 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/3 max-w-24 rounded bg-muted animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const hasResults = filteredItems && filteredItems.length > 0;
  const showNoResults =
    filteredItems && filteredItems.length === 0 && debouncedSearchQuery.trim();

  return (
    <div className={className}>
      <ListSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={clearSearch}
        placeholder="Search AI services..."
      />

      {bookmarks.length > 0 ? (
        <div className="bg-background/95 backdrop-blur-sm sm:rounded-xl sm:border sm:shadow-sm px-3 sm:p-3 mb-3">
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
              className="text-xs sm:text-sm text-destructive"
              title="Clear all bookmarks"
            >
              <Trash className="h-3 w-3" />
              Clear all
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {bookmarks.map((item) => {
              const initials = getFirstTwoWordInitialsFromName(item.title);

              return (
                <Link
                  key={item.id}
                  href={item.url}
                  className="group"
                  title={item.title}
                >
                  <div className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Avatar className="size-8 rounded-md ring-1 ring-border bg-muted">
                      <AvatarImage src={item.logo_url} alt={item.title} />
                      <AvatarFallback
                        title={item.title}
                        className="font-medium text-xs"
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      {item.title}
                    </span>
                  </div>
                </Link>
              );
            })}

            {/* Show "Explore" item if less than 4 bookmarks */}
            {bookmarks.length < 4 && (
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
                4 - bookmarks.length - (bookmarks.length < 4 ? 1 : 0)
              ),
            }).map((_, index) => (
              <div key={`empty-${index}`} className="size-8" />
            ))}
          </div>
        </div>
      ) : null}

      {showNoResults ? (
        <div className="text-center py-8 px-4">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No services found
          </h3>
          <p className="text-muted-foreground mb-4">
            No AI services match your search for &quot;{debouncedSearchQuery}
            &quot;
          </p>
          <button
            onClick={clearSearch}
            className="text-primary hover:text-primary/80 font-medium"
          >
            Clear search
          </button>
        </div>
      ) : (
        hasResults && (
          <div>
            <AiServicesList items={filteredItems!} />
          </div>
        )
      )}
    </div>
  );
}
