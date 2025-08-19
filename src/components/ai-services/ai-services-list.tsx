"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export type CatalogItem = {
  domain: string;
  name: string;
  category: string;
  description: string;
  logo_url?: string;
  source?: string;
  cashback_rate?: number;
  discount_rate?: number;
  destination?: number;
};

export type CatalogResponse = CatalogItem[];

function ListRow({ item }: { item: CatalogItem }) {
  const initials = getFirstTwoWordInitialsFromName(item.name);

  return (
    <li>
      <Link
        href={`/ai-services/${encodeURIComponent(item.domain)}`}
        className="flex items-start gap-3 px-4 py-4 border-b last:border-b-0 hover:bg-accent/30 transition-colors relative"
      >
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
            </div>
          </div>
          <p
            className="text-sm text-muted-foreground line-clamp-2 leading-relaxed"
            title={item.description}
          >
            {item.description}
          </p>
          {item.discount_rate ? (
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                {item.discount_rate}% Discount
              </span>
            </div>
          ) : item.cashback_rate ? (
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {item.cashback_rate}% Cashback
              </span>
            </div>
          ) : null}
        </div>

        <ChevronRight className="size-4 text-muted-foreground m-auto" />
      </Link>
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
