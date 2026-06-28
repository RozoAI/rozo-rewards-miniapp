"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { TIERS } from "./lib";

export function TiersAccordion({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="mt-4">
      <h2 className="text-base font-bold tracking-tight mb-3 px-1">Membership tiers</h2>
      <Card className="p-0 gap-0 overflow-hidden">
        <Accordion type="single" collapsible>
          {TIERS.map((tier) => (
            <AccordionItem
              key={tier.key}
              value={tier.key}
              className="border-b last:border-b-0 px-4"
            >
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground shrink-0">
                    {tier.icon}
                  </div>
                  <span className="text-sm font-semibold">{tier.label}</span>
                  {isConnected && tier.key === "member" && (
                    <Badge variant="secondary" className="text-[10px] font-semibold tracking-wide uppercase">
                      Current
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">
                    Requirements
                  </p>
                  <ul className="space-y-1 mb-4">
                    {tier.requirements.map((r) => (
                      <li key={r} className="flex gap-2 items-start text-sm text-muted-foreground">
                        <span className="mt-2 size-1 rounded-full bg-muted-foreground/50 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">
                    Benefits
                  </p>
                  <ul className="space-y-2">
                    {tier.benefits.map((b) => (
                      <li key={b} className="flex gap-2 items-start text-sm text-foreground">
                        <CheckCircle className="size-4 shrink-0 mt-0.5" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
      <p className="text-xs text-muted-foreground text-center mt-3 px-2 leading-relaxed">
        Tiers are set by spend. Gold, Platinum and Diamond thresholds are placeholders.
      </p>
    </div>
  );
}
