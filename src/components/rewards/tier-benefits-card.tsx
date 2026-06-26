"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { MEMBER_BENEFITS } from "./lib";

export function TierBenefitsCard() {
  return (
    <Card>
      <CardContent className="p-5 py-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold tracking-tight">Current tier benefits</h2>
          <Badge variant="secondary" className="text-xs font-semibold tracking-wide uppercase">
            Member
          </Badge>
        </div>
        <ul className="space-y-2.5">
          {MEMBER_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <CheckCircle className="size-4 shrink-0 mt-0.5 text-foreground" />
              <span className="text-sm leading-snug text-foreground">{b}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
