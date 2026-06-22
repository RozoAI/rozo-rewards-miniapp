"use client";

import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EXCHANGE_RATES,
  getDisplayCurrency,
  getFirstTwoWordInitialsFromName,
} from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
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
  // const { isBookmarked, toggleBookmark } = useBookmarks();
  // const [showFullAddress, setShowFullAddress] = React.useState(false);

  // const handleBookmark = () => {
  //   toggleBookmark({
  //     id: restaurant._id,
  //     title: restaurant.name,
  //     logo_url: restaurant.logo_url,
  //     url: `/restaurant/${restaurant._id}`,
  //   });
  //   toast.success(
  //     isBookmarked(restaurant._id)
  //       ? "Removed from bookmarks"
  //       : "Added to bookmarks",
  //   );
  // };

  const initials = getFirstTwoWordInitialsFromName(restaurant.name);

  return (
    <div className="w-full max-w-xl mx-auto mb-16 flex flex-col gap-4 mt-4 px-4 sm:px-0">
      {/* Header */}
      {mode === "dapp" ? (
        <PageHeader
          title="Back to DApps"
          isBackButton
          paymentHistoryAddress={rozoWalletAddress || ""}
          onBack={onBack}
        />
      ) : (
        <PageHeader title="Back to Discovery" isBackButton />
      )}

      {/* Restaurant Info Card */}
      <Card className="w-full gap-3">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Avatar className="size-16 sm:size-20 rounded-lg ring-1 ring-border bg-muted shrink-0">
              <AvatarImage src={restaurant.logo_url} alt={restaurant.name} />
              <AvatarFallback
                title={restaurant.name}
                className="font-medium text-base sm:text-lg"
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-2">
              <h2
                className="text-xl sm:text-2xl font-bold leading-tight"
                title={restaurant.name}
              >
                {restaurant.name}
              </h2>
              {/* {mode !== "dapp" && (
                <div className="flex items-start gap-2 text-muted-foreground group">
                  <MapPin className="size-4 mt-0.5 shrink-0 group-hover:text-blue-600 transition-colors" />
                  <div className="text-sm leading-relaxed flex-1">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`https://maps.google.com/?q=${restaurant.lat},${restaurant.lon}`}
                        target="_blank"
                        className="font-medium hover:text-foreground hover:underline transition-colors flex-1"
                      >
                        {restaurant.address_line1}
                      </Link>
                      {restaurant.address_line2 && (
                        <button
                          onClick={() => setShowFullAddress(!showFullAddress)}
                          className="p-1 hover:text-foreground transition-colors"
                        >
                          {showFullAddress ? (
                            <ChevronUp className="size-3" />
                          ) : (
                            <ChevronDown className="size-3" />
                          )}
                        </button>
                      )}
                    </div>
                    {restaurant.address_line2 && showFullAddress && (
                      <p className="text-muted-foreground mt-1">
                        {restaurant.address_line2}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                {restaurant.cashback_rate > 0 && (
                  <Badge
                    variant="default"
                    className="text-xs bg-success/10 text-success dark:bg-success/20 rounded-full border-0"
                  >
                    <BadgePercent className="size-3" />
                    Cashback: <b>{restaurant.cashback_rate}%</b>
                  </Badge>
                )}
              </div> */}
            </div>

            {/* <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleBookmark}
                variant={isBookmarked(restaurant._id) ? "default" : "outline"}
                size="icon"
                title={
                  isBookmarked(restaurant._id)
                    ? "Remove from bookmarks"
                    : "Add to bookmarks"
                }
              >
                <Bookmark
                  className={`size-4 ${
                    isBookmarked(restaurant._id) ? "fill-current" : ""
                  }`}
                />
              </Button>
              <Button onClick={onShare} variant="default" size="icon">
                <Share className="size-4" />
              </Button>
            </div> */}
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {/* Action Buttons */}
          {restaurant.is_live && (
            <div className="flex flex-col gap-3 pt-2 mb-6">
              <div className="space-y-3">
                {/* Amount Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="payment-amount"
                    className="text-sm font-medium"
                  >
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {getDisplayCurrency(restaurant?.currency)}
                    </span>
                    <Input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => onAmountChange(e.target.value)}
                      className={`pl-12 h-11 sm:h-12 text-sm sm:text-base [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-moz-appearance]:textfield`}
                    />
                  </div>

                  {getDisplayCurrency(restaurant?.currency) !== "USD" && (
                    <p className="text-xs text-muted-foreground">
                      <span className="text-muted-foreground font-medium">
                        1 {getDisplayCurrency(restaurant?.currency)} ={" "}
                        {(
                          1 /
                          (EXCHANGE_RATES[
                            getDisplayCurrency(restaurant?.currency)
                          ] || 1)
                        ).toFixed(2)}{" "}
                        USD
                      </span>
                    </p>
                  )}
                </div>

                {/* Payment Buttons */}
                {paymentSlot}
              </div>
            </div>
          )}

          {/* Contact & Support */}
          {/* <ContactSupport /> */}
        </CardContent>
      </Card>
    </div>
  );
}
