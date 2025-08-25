"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export type CatalogItem = {
  domain: string;
  name: string;
  price_in_usd: number;
  original_value_usd: number;
  duration_months: number;
  destination: number;
  category: string;
  description: string;
  offer_description: string;
  logo_url: string;
  cashback_rate: number;
  discount_rate: number;
  savings_usd: number;
  source: string;
  sold_out?: boolean;
};

export type CatalogResponse = CatalogItem[];

function ListRow({ item }: { item: CatalogItem }) {
  const initials = getFirstTwoWordInitialsFromName(item.name);
  const hasBundle = item.original_value_usd > 0;
  const hasCashback = item.cashback_rate > 0;

  return (
    <li>
      <Link
        href={`/ai-services/${encodeURIComponent(item.domain)}`}
        className="block px-3 py-4 sm:px-4 sm:py-5 border-b last:border-b-0 hover:bg-accent/50 active:bg-accent/70 transition-colors duration-200 group"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Avatar */}
          <Avatar className="size-14 sm:size-16 rounded-xl ring-1 ring-border/50 bg-muted/50 flex-shrink-0 group-hover:ring-primary/20 transition-all duration-200">
            {item.logo_url ? (
              <AvatarImage
                src={item.logo_url}
                alt={item.name}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback
              title={item.name}
              className="font-semibold text-sm sm:text-base bg-gradient-to-br from-primary/10 to-primary/5 text-primary"
            >
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Header with Name and Price */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold leading-tight text-foreground group-hover:text-primary transition-colors duration-200">
                  {item.name}
                </h3>
              </div>

              {/* Savings for bundle items */}
              {hasBundle && (
                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    ${item.price_in_usd}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground line-through">
                    ${item.original_value_usd}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {item.description}
            </p>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {item.sold_out && (
                <Badge
                  variant="outline"
                  className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                >
                  Sold Out
                </Badge>
              )}

              {!item.sold_out && item.discount_rate > 0 && (
                <Badge
                  variant="destructive"
                  className="text-xs font-semibold bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-500/20"
                >
                  {item.discount_rate}% OFF
                </Badge>
              )}
              {/* 
              {!item.sold_out && hasCashback && (
                <Badge
                  variant="secondary"
                  className="text-xs font-semibold bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20"
                >
                  {item.cashback_rate}% Cashback
                </Badge>
              )} */}

              {!item.sold_out && hasBundle && item.duration_months > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md flex items-center gap-1">
                  <Clock className="size-3" />
                  {item.duration_months} months
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="size-5 text-muted-foreground/60 flex-shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
        </div>
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
      className={cn(
        "divide-y divide-border/50 bg-card/50 backdrop-blur-sm",
        "sm:rounded-xl sm:border sm:shadow-sm",
        "border-t border-border/50",
        "overflow-hidden",
        className
      )}
    >
      {items.map((item) => (
        <ListRow key={item.domain} item={item} />
      ))}
    </ul>
  );
});
