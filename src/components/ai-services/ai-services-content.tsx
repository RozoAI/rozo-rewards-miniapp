"use client";

import { ListSearchInput } from "@/components/list-search-input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import * as React from "react";
import data from "../../../public/ai_commerce_catalog.json";
import { AiServicesList, CatalogItem } from "./ai-services-list";

type CatalogResponse = CatalogItem[];

export function AiServicesContent({ className }: { className?: string }) {
  const [items, setItems] = React.useState<CatalogItem[] | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        if (!Array.isArray(data)) throw new Error("Invalid data shape");
        if (isMounted) {
          const filteredData = data.filter(
            (item) => item.discount_rate && item.discount_rate !== 0
          );
          setItems(filteredData);
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
        <ListSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={clearSearch}
          placeholder="Search AI services..."
        />
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
        hasResults && <AiServicesList items={filteredItems!} />
      )}
    </div>
  );
}
