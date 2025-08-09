"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import Link from "next/link";
import { ExternalLink, LinkIcon } from "lucide-react";

type CatalogItem = {
  domain: string;
  name: string;
  category: string;
  description: string;
  logo_url?: string;
  source?: string;
};

type CatalogResponse = CatalogItem[];

function ListRow({ item }: { item: CatalogItem }) {
  const initials = getFirstTwoWordInitialsFromName(item.name);
  const href = item.source || `https://${item.domain}`;

  return (
    <li className="flex items-start gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors">
      <Avatar className="size-16 rounded-xl ring-1 ring-border bg-muted">
        {item.logo_url ? (
          <AvatarImage src={item.logo_url} alt={item.name} />
        ) : null}
        <AvatarFallback title={item.name} className="font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold truncate" title={item.name}>
            {item.name}
          </h3>
        </div>
        <p
          className="text-xs text-muted-foreground mb-1 line-clamp-1"
          title={item.category}
        >
          {item.category} · {item.domain}
        </p>
        <p
          className="text-sm text-muted-foreground line-clamp-1"
          title={item.description}
        >
          {item.description}
        </p>
        <Link
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary line-clamp-1 flex items-center gap-1"
        >
          <ExternalLink className="size-3" /> Visit website
        </Link>
      </div>
    </li>
  );
}

export function AiCommerceListView({ className }: { className?: string }) {
  const [items, setItems] = React.useState<CatalogItem[] | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await fetch("/ai_commerce_catalog.json", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data: CatalogResponse = await res.json();
        if (!Array.isArray(data)) {
          throw new Error("Invalid data shape");
        }
        if (isMounted) setItems(data);
      } catch (err) {
        if (isMounted)
          setErrorMessage(
            err instanceof Error ? err.message : "Unknown error loading data"
          );
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (errorMessage) {
    return (
      <div className={cn("p-4 text-sm text-red-600", className)}>
        {errorMessage}
      </div>
    );
  }

  if (!items) {
    return (
      <ul className={cn("divide-y rounded-md rounded-b-none ", className)}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <li key={idx} className="flex items-start gap-4 px-4 py-3">
            <div className="size-16 rounded-xl bg-muted animate-pulse ring-1 ring-border" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-44 rounded bg-muted animate-pulse" />
              <div className="h-3 w-72 max-w-[70%] rounded bg-muted animate-pulse" />
              <div className="h-3 w-56 max-w-[60%] rounded bg-muted animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn("divide-y rounded-md rounded-b-none border", className)}>
      {items.map((item) => (
        <ListRow key={item.domain} item={item} />
      ))}
    </ul>
  );
}
