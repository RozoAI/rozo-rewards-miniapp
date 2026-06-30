"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fmt, StellarRewards } from "./lib";

export function SeedsCard({
  stellarRewards,
  stellarRewardsLoading,
}: {
  stellarRewards: StellarRewards | null;
  stellarRewardsLoading: boolean;
}) {
  return (
    <Card className="rounded-3xl">
      <CardContent className="p-5 py-0">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Seeds
        </p>
        {stellarRewardsLoading || stellarRewards === null ? (
          <div className="h-10 w-28 rounded-lg bg-muted animate-pulse mt-1" />
        ) : (
          <p className="text-4xl font-bold tracking-tight tabular-nums leading-tight">
            {fmt(stellarRewards.seeds, 2)}
          </p>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground mt-4">
          Rewards for bridging and depositing USDC.
        </p>
        <Separator className="mt-4" />
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
            Earn by
          </p>
          <div className="flex gap-2">
            {["Bridge", "Deposit"].map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="rounded-lg font-medium"
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
