"use client";

import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  convertToUSD,
  getDisplayCurrency,
  getFirstTwoWordInitialsFromName,
} from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { Info } from "lucide-react";
import React from "react";

export interface RestaurantDetailBaseProps {
  restaurant: Restaurant;
  mode: "dapp" | "discovery";
  rozoWalletAddress?: string;
  paymentAmount: string;
  onAmountChange: (value: string) => void;
  onShare: () => void;
  onBack?: () => void;
  paymentSlot: React.ReactNode;
}

export function RestaurantDetailBase({
  restaurant,
  mode,
  rozoWalletAddress,
  paymentAmount,
  onAmountChange,
  onShare,
  onBack,
  paymentSlot,
}: RestaurantDetailBaseProps) {
  const initials = getFirstTwoWordInitialsFromName(restaurant.name);
  const isDapp = mode === "dapp";

  return (
    <div className="w-full max-w-xl mx-auto mb-16 flex flex-col gap-3 mt-4 px-4 sm:px-0">
      {/* Header */}
      {isDapp ? (
        <PageHeader
          title="Back to Merchants"
          isBackButton
          paymentHistoryAddress={rozoWalletAddress || ""}
          onBack={onBack}
        />
      ) : (
        <PageHeader title="" isHomeButton />
      )}

      {/* Payment Card */}
      <Card className="w-full">
        <CardContent className="px-4 space-y-4">
          {/* Compact Restaurant Header */}
          <div className="flex items-center gap-3">
            <Avatar className="size-12 rounded-lg ring-1 ring-border bg-muted shrink-0">
              <AvatarImage src={restaurant.logo_url} alt={restaurant.name} />
              <AvatarFallback
                title={restaurant.name}
                className="font-medium text-sm"
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2
                className="text-lg font-semibold truncate"
                title={restaurant.name}
              >
                {restaurant.name}
              </h2>
            </div>
          </div>

          {restaurant.is_live ? (
            <>
              {/* Amount Input - Prominent */}
              <div className="space-y-1.5">
                <label
                  htmlFor="payment-amount"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">
                    {getDisplayCurrency(restaurant?.currency)}
                  </span>
                  <Input
                    id="payment-amount"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(",", ".");
                      if (/^\d*\.?\d*$/.test(val)) onAmountChange(val);
                    }}
                    className="pl-14 h-14 text-2xl font-semibold"
                    autoFocus
                  />
                </div>

                {getDisplayCurrency(restaurant?.currency) !== "USD" && (
                  <p className="text-xs text-muted-foreground">
                    Equivalent in USD: $
                    {convertToUSD(
                      paymentAmount,
                      getDisplayCurrency(restaurant?.currency),
                    )}
                  </p>
                )}
              </div>

              {isDapp && (
                <div className="flex items-start gap-1.5">
                  <Info className="size-4 text-muted-foreground" />
                  <p className="text-left text-xs text-muted-foreground">
                    Physical goods & services only. No digital content or in-app
                    features.
                  </p>
                </div>
              )}

              {/* Payment Buttons */}
              {paymentSlot}
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              This restaurant is not accepting payments yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
