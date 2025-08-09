"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export type CatalogItem = {
  domain: string;
  name: string;
  category: string;
  description: string;
  logo_url?: string;
  source?: string;
};

export type CatalogResponse = CatalogItem[];

function ListRow({ item }: { item: CatalogItem }) {
  const initials = getFirstTwoWordInitialsFromName(item.name);
  const href = item.source || `https://${item.domain}`;

  return (
    <li className="flex items-start gap-3 px-4 py-4 border-b last:border-b-0 hover:bg-accent/30 transition-colors">
      <Avatar className="size-12 sm:size-16 rounded-lg ring-1 ring-border bg-muted flex-shrink-0">
        {item.logo_url ? (
          <AvatarImage
            src={item.logo_url}
            alt={item.name}
            className="object-cover"
          />
        ) : null}
        <AvatarFallback
          title={item.name}
          className="font-medium text-sm sm:text-base"
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h3
              className="text-base sm:text-lg font-semibold leading-tight"
              title={item.name}
            >
              {item.name}
            </h3>
            {/* <p className="text-xs text-muted-foreground" title={item.category}>
              {item.category} · {item.domain}
            </p> */}
          </div>

          <Link
            href={`/ai-services/${encodeURIComponent(item.domain)}`}
            className="inline-flex items-center px-3 py-1.5 border rounded-md text-sm hover:bg-accent"
          >
            View Details
          </Link>
        </div>
        <p
          className="text-sm text-muted-foreground line-clamp-2 leading-relaxed"
          title={item.description}
        >
          {item.description}
        </p>
        {/* <Link
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <ExternalLink className="size-3" />
          Visit website
        </Link> */}
      </div>
    </li>
  );
}

export const AiServicesList = React.memo(function AiServicesList({
  items,
  className,
}: {
  items: CatalogItem[];
  className?: string;
}) {
  return (
    <ul
      className={
        "divide-y rounded-md rounded-b-none border " + (className ?? "")
      }
    >
      {items.map((item) => (
        <ListRow key={item.domain} item={item} />
      ))}
    </ul>
  );
});
