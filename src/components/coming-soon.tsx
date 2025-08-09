"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ComingSoonProps = {
  title?: string;
  description?: string;
  eta?: string;
  icon?: React.ReactNode;
  ctaLabel?: string;
  href?: string;
  onCtaClick?: () => void;
  notifySlot?: React.ReactNode;
  className?: string;
};

export function ComingSoon({
  title = "Coming soon",
  description = "We're putting the finishing touches on this experience. Check back shortly.",
  eta,
  icon,
  ctaLabel,
  href,
  onCtaClick,
  notifySlot,
  className,
}: ComingSoonProps) {
  const hasCta = Boolean(ctaLabel && (href || onCtaClick));

  return (
    <section className={cn("w-full", className)}>
      <div className="mx-auto max-w-xl px-4 py-16 sm:py-24 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-muted ring-1 ring-border shadow-sm">
          {icon ?? <span className="text-2xl">🚧</span>}
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {eta ? (
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {eta}
          </p>
        ) : null}

        {description ? (
          <p className="mx-auto mt-3 max-w-prose text-balance text-muted-foreground">
            {description}
          </p>
        ) : null}

        {notifySlot ? <div className="mt-6">{notifySlot}</div> : null}

        {hasCta ? (
          <div className="mt-6 flex justify-center">
            {href ? (
              <Button asChild>
                <Link href={href}>{ctaLabel}</Link>
              </Button>
            ) : (
              <Button onClick={onCtaClick}>{ctaLabel}</Button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default ComingSoon;
