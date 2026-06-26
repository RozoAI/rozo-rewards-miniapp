"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
import { fmt, fmtPoints, SILVER_THRESHOLD, StellarRewards, WalletType } from "./lib";

export function PointsCard({
  points,
  pointsLoading,
  walletType,
  stellarRewards,
  stellarRewardsLoading,
}: {
  points: number | null;
  pointsLoading: boolean;
  walletType: WalletType;
  stellarRewards: StellarRewards | null;
  stellarRewardsLoading: boolean;
}) {
  return (
    <Card className="bg-primary text-primary-foreground border-0 rounded-3xl">
      <CardContent className="p-5 py-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary-foreground/55 uppercase">
              Total points
            </p>
            <div className="flex items-baseline gap-2 mt-2.5">
              {pointsLoading || points === null ? (
                <div className="h-12 w-32 rounded-lg bg-primary-foreground/15 animate-pulse" />
              ) : (
                <>
                  <span className="text-5xl font-bold tracking-tight tabular-nums leading-none">
                    {fmtPoints(points)}
                  </span>
                  <span className="text-sm font-medium text-primary-foreground/60">pts</span>
                </>
              )}
            </div>
          </div>
          <Badge className="bg-primary-foreground/10 text-primary-foreground border-0 gap-1.5 hover:bg-primary-foreground/15">
            <TrendingUp className="size-3" />
            Member
          </Badge>
        </div>

        {walletType === "stellar" && (
          <div className="mt-5">
            {stellarRewardsLoading || stellarRewards === null ? (
              <div className="h-10 w-full rounded-lg bg-primary-foreground/15 animate-pulse" />
            ) : (() => {
              const spent = stellarRewards.totalVolumeUsdc;
              const pct = Math.min(100, (spent / SILVER_THRESHOLD) * 100);
              const remain = Math.max(0, SILVER_THRESHOLD - spent);
              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary-foreground/60">Spend this year</span>
                    <span className="text-xs font-semibold text-primary-foreground">
                      Silver at ${fmt(SILVER_THRESHOLD, 0)}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5 bg-primary-foreground/15 [&>div]:bg-primary-foreground" />
                  <p className="text-xs text-primary-foreground/60 mt-2">
                    Spend{" "}
                    <span className="text-primary-foreground font-semibold">${fmt(remain, 0)}</span>{" "}
                    more this year to reach Silver
                  </p>
                </>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
