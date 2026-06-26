"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sprout, TrendingUp, Wallet } from "lucide-react";

export function TeaserCard({ onConnect }: { onConnect: () => void }) {
  return (
    <Card className="bg-primary text-primary-foreground border-0 rounded-3xl">
      <CardContent className="p-6 py-0">
        <p className="text-xs font-semibold tracking-widest text-primary-foreground/50 uppercase">
          ROZO Rewards
        </p>
        <h2 className="text-2xl font-bold tracking-tight leading-snug mt-2.5">
          Earn as you spend,
          <br />
          and as you bridge.
        </h2>

        <div className="mt-5 bg-primary-foreground/[0.08] rounded-2xl overflow-hidden divide-y divide-primary-foreground/[0.08]">
          {[
            {
              icon: <TrendingUp className="size-4 text-primary-foreground" />,
              title: "Points",
              desc: "Earned when you spend, check in, or invite. They set your membership tier.",
            },
            {
              icon: <Sprout className="size-4 text-primary-foreground" />,
              title: "Seeds",
              desc: "Earned when you bridge or deposit USDC on Stellar. They power campaigns.",
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-3 p-4">
              <div className="size-9 shrink-0 rounded-xl bg-primary-foreground/[0.12] flex items-center justify-center">
                {icon}
              </div>
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="text-xs leading-relaxed text-primary-foreground/65 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Button
          className="w-full mt-4 bg-background text-foreground hover:bg-background/90 rounded-xl h-12 text-sm font-semibold gap-2"
          onClick={onConnect}
        >
          <Wallet className="size-4" />
          Connect wallet to start
        </Button>
        <p className="text-xs text-primary-foreground/45 text-center mt-3">
          Browse tiers below — no wallet needed
        </p>
      </CardContent>
    </Card>
  );
}
