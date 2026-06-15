"use client";

import { ContactSupport } from "@/components/contact-support";
import { PageHeader } from "@/components/page-header";
import { RestaurantDappPayment } from "@/components/restaurant/restaurant-dapp-payment";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { capture } from "@/lib/analytics/index";
import { REWARDS_EVENTS } from "@/lib/analytics/events";
import { getRestaurantById } from "@/lib/restaurants";
import {
  convertToUSD,
  EXCHANGE_RATES,
  getDisplayCurrency,
  getFirstTwoWordInitialsFromName,
} from "@/lib/utils";
import { useComposeCast, useIsInMiniApp } from "@coinbase/onchainkit/minikit";
import {
  BadgePercent,
  Bookmark,
  ChevronDown,
  ChevronUp,
  MapPin,
  Share,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo } from "react";
import { toast } from "sonner";

const RestaurantDiscoveryPayment = dynamic(
  () =>
    import("@/components/restaurant/restaurant-discovery-payment").then(
      (m) => m.RestaurantDiscoveryPayment,
    ),
  { ssr: false },
);

export default function RestaurantDetailPage() {
  const searchParams = useSearchParams();
  const isDapp = searchParams.get("dapp") === "true";
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id as string;
  const { isInMiniApp } = useIsInMiniApp();
  const { composeCast } = useComposeCast();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const {
    isAvailable: isRozoWalletAvailable,
    isConnected: isRozoWalletConnected,
    walletAddress: rozoWalletAddress,
  } = useRozoWallet();

  const restaurant = React.useMemo(
    () => getRestaurantById(restaurantId),
    [restaurantId],
  );
  const [loading, setLoading] = React.useState(false);
  const [error] = React.useState<string | null>(
    restaurant ? null : restaurantId ? "Restaurant not found" : null,
  );
  const [paymentAmount, setPaymentAmount] = React.useState<string>(() => {
    const price =
      restaurant?.price && !isNaN(Number(restaurant.price))
        ? Number(restaurant.price)
        : 0;
    return price > 0 ? price.toFixed(2) : "";
  });
  const [showFullAddress, setShowFullAddress] = React.useState(false);
  const [appId] = React.useState<string>(
    () => `rozoRewardsBNBStellarMP-${restaurant?.handle || ""}`,
  );

  const [merchantOrderId] = React.useState<string>(
    `${restaurant?.handle.toUpperCase()}-${new Date().getTime()}`,
  );
  const receiptUrl = `https://ns.rozo.ai/payment/success?order_id=${merchantOrderId}`;

  const toAddress = useMemo(() => {
    return restaurant?.payTo ?? "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897";
  }, [restaurant]);

  const generateMetadata = (amountLocal: string, currencyLocal: string) => {
    const displayCurrency = getDisplayCurrency(currencyLocal);
    const usdAmount = convertToUSD(amountLocal, displayCurrency);

    const baseMetadata = {
      amount_local: amountLocal,
      currency_local: displayCurrency,
      items: [
        {
          name: restaurant?.name,
          description: `${displayCurrency} ${amountLocal} (${usdAmount} USD)`,
        },
      ],
    };

    if (restaurant?.handle && restaurant?.name) {
      return {
        ...baseMetadata,
        merchant_order_id: merchantOrderId,
        ...(restaurant?.is_live ? { receiptUrl: receiptUrl } : {}),
        items: [
          ...baseMetadata.items,
          {
            name: "Order ID",
            description: merchantOrderId,
          },
        ],
      };
    }

    return baseMetadata;
  };

  useEffect(() => {
    if (!restaurantId || !restaurant) return;

    capture(REWARDS_EVENTS.MERCHANT_VIEWED, {
      merchant_id: restaurant._id,
      merchant_name: restaurant.name,
    });

    router.prefetch("/receipt");
  }, [restaurantId, restaurant, router]);

  const handleAmountChange = (value: string) => {
    if (!restaurant) return;
    setPaymentAmount(value);
  };

  const handleShare = () => {
    const text = `Check out ${restaurant?.name} at ${
      restaurant?.address_line1
    }!${
      restaurant?.cashback_rate
        ? ` Get ${restaurant.cashback_rate}% cashback!`
        : ""
    }`;

    if (restaurant) {
      capture(REWARDS_EVENTS.MERCHANT_SHARE_CLICKED, {
        merchant_id: restaurant._id,
        merchant_name: restaurant.name,
        channel: isInMiniApp ? "farcaster" : "native_share",
      });
    }

    if (isInMiniApp) {
      composeCast({
        text,
        embeds: [window.location.href],
      });
    } else {
      (async () => {
        try {
          const shareData: ShareData = {
            title: text,
            url: window.location.href,
          };
          await navigator.share(shareData);
          console.log("Shared successfully");
        } catch (err) {
          console.error(`Error sharing: ${err}`);
        }
      })();
    }
  };

  const handleBookmark = () => {
    if (restaurant) {
      const wasBookmarked = isBookmarked(restaurant._id);
      toggleBookmark({
        id: restaurant._id,
        title: restaurant.name,
        logo_url: restaurant.logo_url,
        url: `/restaurant/${restaurant._id}`,
      });
      capture(REWARDS_EVENTS.MERCHANT_BOOKMARKED, {
        merchant_id: restaurant._id,
        merchant_name: restaurant.name,
        action: wasBookmarked ? "remove" : "add",
      });
      toast.success(
        wasBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
      );
    }
  };

  if (loading) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <PageHeader title="Back to Lifestyle" isBackButton />
        <Card className="w-full">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-start gap-3">
              <div className="size-16 sm:size-20 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 sm:h-6 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              <div className="h-3 w-full bg-muted animate-pulse rounded" />
              <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-11 w-full bg-muted animate-pulse rounded-md" />
            <div className="h-11 w-full bg-muted animate-pulse rounded-md" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <PageHeader title="Back to Lifestyle" isBackButton />
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-destructive text-lg font-medium mb-2">
              {error || "Restaurant not found"}
            </p>
            <p className="text-muted-foreground mb-4">
              The restaurant you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
            <Button onClick={() => router.push("/lifestyle")} variant="outline">
              Back to Lifestyle
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = getFirstTwoWordInitialsFromName(restaurant.name);

  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
      {/* Header */}
      {isRozoWalletAvailable && isRozoWalletConnected ? (
        <PageHeader
          title="Back to DApps"
          isBackButton
          paymentHistoryAddress={rozoWalletAddress || ""}
        />
      ) : (
        <PageHeader title="Back to Lifestyle" isBackButton />
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
              {!isDapp && (
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
              {/* Price and Cashback Details */}
              <div className="flex items-center gap-3 pt-1">
                {restaurant.cashback_rate > 0 && (
                  <Badge
                    variant="default"
                    className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full"
                  >
                    <BadgePercent className="size-3" />
                    Cashback: <b>{restaurant.cashback_rate}%</b>
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleBookmark}
                variant={
                  isBookmarked(restaurant?._id || "") ? "default" : "outline"
                }
                size="icon"
                title={
                  isBookmarked(restaurant?._id || "")
                    ? "Remove from bookmarks"
                    : "Add to bookmarks"
                }
              >
                <Bookmark
                  className={`size-4 ${
                    isBookmarked(restaurant?._id || "") ? "fill-current" : ""
                  }`}
                />
              </Button>
              <Button onClick={handleShare} variant="default" size="icon">
                <Share className="size-4" />
              </Button>
            </div>
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
                      onChange={(e) => handleAmountChange(e.target.value)}
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

                {/* Payment Buttons - Conditional based on Rozo Wallet availability */}
                {isRozoWalletAvailable && isRozoWalletConnected ? (
                  // Pay with Rozo Wallet (Stellar USDC) - REPLACES other payment methods
                  <RestaurantDappPayment
                    restaurant={restaurant}
                    paymentAmount={paymentAmount}
                    appId={appId}
                    merchantOrderId={merchantOrderId}
                  />
                ) : (
                  // Original Payment Buttons - ONLY shown when Rozo Wallet NOT available,
                  // and only in discovery mode (not loaded inside the Rozo Wallet dapp webview)
                  !isDapp && (
                    <RestaurantDiscoveryPayment
                      restaurant={restaurant}
                      paymentAmount={paymentAmount}
                      appId={appId}
                      merchantOrderId={merchantOrderId}
                      toAddress={toAddress}
                      generateMetadata={generateMetadata}
                      loading={loading}
                      setLoading={setLoading}
                    />
                  )
                )}
              </div>
            </div>
          )}

          {/* Contact & Support */}
          <ContactSupport />
        </CardContent>
      </Card>
    </div>
  );
}
