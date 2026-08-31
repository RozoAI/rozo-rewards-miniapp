"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DappItem } from "@/lib/dapps";
import { Button } from "@/components/ui/button";
import { DAPP_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { cn, getFirstTwoWordInitialsFromName } from "@/lib/utils";

export interface DappListProps {
  dapps: DappItem[];
  os?: string | null;
  className?: string;
}

export function DappList({ dapps, os = null, className }: DappListProps) {
  const visibleDapps = dapps.filter(
    (dapp) =>
      os === null ||
      dapp.visibleOs === undefined ||
      dapp.visibleOs.includes(os),
  );

  if (visibleDapps.length === 0) return null;

  return (
    <ul
      className={cn(
        "divide-y divide-border rounded-xl border border-border bg-card overflow-hidden",
        className,
      )}
    >
      {visibleDapps.map((dapp) => {
        const initials = getFirstTwoWordInitialsFromName(dapp.name);
        return (
          <li key={dapp.id}>
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar className="size-11 rounded-lg ring-1 ring-border bg-muted shrink-0">
                {dapp.logoUrl && (
                  <AvatarImage src={dapp.logoUrl} alt={`${dapp.name} logo`} />
                )}
                <AvatarFallback className="rounded-lg font-medium text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate text-sm leading-tight">
                  {dapp.name}
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {dapp.description}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full shrink-0"
                onClick={() => {
                  capture(DAPP_EVENTS.DAPP_OPENED, { dapp_id: dapp.id });
                  window.open(dapp.url, "_blank", "noopener,noreferrer");
                }}
              >
                Open
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
