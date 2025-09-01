"use client";

import { ContactSupport } from "@/components/contact-support";
import { PageHeader } from "@/components/page-header";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRozoPointAPI } from "@/hooks/useRozoPointAPI";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { useComposeCast, useIsInMiniApp } from "@coinbase/onchainkit/minikit";
import { baseUSDC, PaymentCompletedEvent } from "@rozoai/intent-common";
import { RozoPayButton, useRozoPay, useRozoPayUI } from "@rozoai/intent-pay";

import {
  BadgePercent,
  Coins,
  CreditCard,
  HelpCircle,
  Loader2,
  MapPin,
  Share,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id as string;
  const { resetPayment } = useRozoPayUI();
  const { paymentState } = useRozoPay();
  const { getPoints, spendPoints } = useRozoPointAPI();
  const { address, isConnected } = useAccount();
  const { isInMiniApp } = useIsInMiniApp();
  const { composeCast } = useComposeCast();

  const [restaurant, setRestaurant] = React.useState<Restaurant | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState<string>("");
  const [points, setPoints] = React.useState(0);
  const [pointsLoading, setPointsLoading] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [dialogLoading, setDialogLoading] = React.useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadRestaurant() {
      try {
        const res = await fetch("/coffee_mapdata.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();

        const foundRestaurant = data.locations.find(
          (loc: Restaurant) => loc._id === restaurantId
        );
        if (!foundRestaurant) {
          throw new Error("Lifestyle not found");
        }

        setRestaurant(foundRestaurant as Restaurant);

        let price = 0;
        if (foundRestaurant.price && !isNaN(Number(foundRestaurant.price))) {
          price = Number(foundRestaurant.price);
          setPaymentAmount(price.toFixed(2));
        }

        const displayCurrency =
          foundRestaurant.currency === "RM"
            ? "RM"
            : foundRestaurant.currency || "USD";
        const usdAmount =
          foundRestaurant.currency === "RM"
            ? (price / 4.2).toFixed(2)
            : price.toString();

        resetPayment({
          intent: `${foundRestaurant.name} - ${displayCurrency} ${price.toFixed(
            2
          )}`,
          toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
          toChain: baseUSDC.chainId,
          toToken: baseUSDC.token as `0x${string}`,
          toUnits: usdAmount,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (restaurantId) {
      loadRestaurant();
    }
  }, [restaurantId]);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!address) return;

      setPointsLoading(true);
      const points = await getPoints(address);
      setPoints(points / 100);
      setPointsLoading(false);
    };
    fetchPoints();
  }, [isConnected, address]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  console.log("paymentState", paymentState);

  const [isDebouncing, setIsDebouncing] = React.useState(false);

  const handleAmountChange = (value: string) => {
    if (!restaurant) return;
    setPaymentAmount(value);
    setIsDebouncing(true);

    // Clear the previous timer if it exists
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      const displayCurrency =
        restaurant.currency === "RM" ? "RM" : restaurant.currency || "USD";
      const usdAmount =
        restaurant.currency === "RM"
          ? (parseFloat(value) / rmToUsdRate).toFixed(2)
          : value;

      resetPayment({
        intent: `Pay for ${restaurant.name} - ${displayCurrency} ${value}`,
        toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
        toChain: baseUSDC.chainId,
        toToken: baseUSDC.token as `0x${string}`,
        toUnits: usdAmount, // Use USD amount for payment processing
      });
      setIsDebouncing(false);
      debounceTimerRef.current = null;
    }, 500);
  };

  const handlePayWithPoints = () => {
    setShowConfirmDialog(true);
  };

  const confirmPaymentWithPoints = async () => {
    if (!address || !restaurant || !paymentAmount) return;

    setDialogLoading(true);

    const usdAmount = convertToUSD(paymentAmount);
    const displayCurrency = getDisplayCurrency();

    const paymentData = {
      from_address: address,
      to_handle:
        restaurant.handle || restaurant.name.toLowerCase().replace(/\s+/g, ""),
      amount_usd_cents: parseFloat(usdAmount) * 100,
      amount_local: parseFloat(paymentAmount),
      currency_local: displayCurrency,
      timestamp: Date.now(),
      order_id: Date.now().toString(),
      about: `Pay for ${restaurant.name} - ${displayCurrency} ${paymentAmount}`,
    };

    const response = await spendPoints(paymentData);

    if (response && response.status === "success") {
      // Store payment data in sessionStorage for receipt page
      const receiptData = {
        ...response.data,
        restaurant_name: restaurant.name,
        restaurant_address: restaurant.address_line1,
      };

      sessionStorage.setItem("payment_receipt", JSON.stringify(receiptData));

      setShowConfirmDialog(false);

      // Navigate to receipt page
      router.push("/receipt");
    } else {
      toast.error("Failed to spend points");
      setDialogLoading(false);
    }
  };

  const handleShare = () => {
    const text = `Check out ${restaurant?.name} at ${
      restaurant?.address_line1
    }!${
      restaurant?.cashback_rate
        ? ` Get ${restaurant.cashback_rate}% cashback!`
        : ""
    }`;

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

  if (loading) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-muted animate-pulse rounded-md" />
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </div>
        <Card className="w-full">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-start gap-3">
              <div className="size-16 sm:size-20 rounded-lg bg-muted animate-pulse flex-shrink-0" />
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
  const currency = restaurant.currency || "USD";

  // Currency conversion utilities
  const rmToUsdRate = 4.2;
  const minRMAmount = rmToUsdRate * 0.1;
  const isRMCurrency = currency === "RM";

  const convertToUSD = (amount: string) => {
    if (!isRMCurrency) return amount;
    const numAmount = parseFloat(amount);
    return isNaN(numAmount) ? "0.00" : (numAmount / rmToUsdRate).toFixed(2);
  };

  const getDisplayCurrency = () => (isRMCurrency ? "RM" : currency);
  const getExchangeRate = () =>
    isRMCurrency ? (1 / rmToUsdRate).toFixed(2) : null;

  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
      {/* Header */}
      <PageHeader title="Back to Lifestyle" isBackButton />

      {/* Restaurant Info Card */}
      <Card className="w-full gap-3">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Avatar className="size-16 sm:size-20 rounded-lg ring-1 ring-border bg-muted flex-shrink-0">
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
              <Link
                href={`https://maps.google.com/?q=${restaurant.lat},${restaurant.lon}`}
                target="_blank"
                className="flex items-start gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 group-hover:text-blue-600 transition-colors" />
                <div className="text-sm leading-relaxed group-hover:underline">
                  <p className="font-medium">{restaurant.address_line1}</p>
                  {restaurant.address_line2 && (
                    <p>{restaurant.address_line2}</p>
                  )}
                </div>
              </Link>
              {/* Price and Cashback Details */}
              <div className="flex items-center gap-3 pt-1">
                {restaurant.price && (
                  <p className="text-sm text-muted-foreground">
                    Price: <b>{restaurant.price}</b>
                  </p>
                )}
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

            <div className="flex items-start gap-2">
              <Button onClick={handleShare} variant="default" size="icon">
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2 mb-6">
            <div className="space-y-3">
              {/* Amount Input */}
              <div className="space-y-2">
                <label htmlFor="payment-amount" className="text-sm font-medium">
                  Payment Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {getDisplayCurrency()}
                  </span>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min={isRMCurrency ? minRMAmount.toFixed(2) : "0.10"}
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={`pl-12 h-11 sm:h-12 text-sm sm:text-base`}
                  />
                </div>
                {paymentAmount &&
                  parseFloat(paymentAmount) <
                    (isRMCurrency ? minRMAmount : 0.1) && (
                    <p className="text-xs text-destructive">
                      Minimum amount is{" "}
                      {isRMCurrency
                        ? `RM ${minRMAmount.toFixed(2)}`
                        : "$0.10 USD"}
                    </p>
                  )}
                {isRMCurrency && getExchangeRate() && (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-muted-foreground font-medium">
                      Exchange rate: 1 RM = {getExchangeRate()} USD
                    </span>
                  </p>
                )}
              </div>

              {/* Payment Button */}
              <RozoPayButton.Custom
                closeOnSuccess
                resetOnSuccess
                appId={`rozoRewards-${restaurant.handle || ''}`}
                toAddress={
                  (restaurant.payTo ??
                    "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897") as `0x${string}`
                }
                toChain={baseUSDC.chainId}
                {...(paymentAmount &&
                parseFloat(paymentAmount) > (isRMCurrency ? minRMAmount : 0.1)
                  ? {
                      toUnits: convertToUSD(paymentAmount),
                    }
                  : {})}
                toToken={baseUSDC.token as `0x${string}`}
                intent={`Pay for ${
                  restaurant.name
                } - ${getDisplayCurrency()} ${paymentAmount}`}
                onPaymentStarted={() => {
                  setLoading(true);
                  setPaymentLoading(true);
                }}
                onPaymentBounced={() => {
                  setLoading(false);
                  setPaymentLoading(false);
                }}
                onPaymentCompleted={(args: PaymentCompletedEvent) => {
                  toast.success(`Payment successful to ${restaurant.name}!`, {
                    description:
                      "Your payment has been processed successfully. Redirecting to receipt...",
                    duration: 2000,
                  });
                  setPaymentLoading(false);
                  setTimeout(() => {
                    window.location.href = `https://invoice.rozo.ai/receipt?id=${
                      args.payment.externalId || args.paymentId
                    }&back_url=${window.location.href}`;
                  }, 2000);
                }}
              >
                {({ show }) => {
                  const usdAmount = convertToUSD(paymentAmount);
                  const minAmount = isRMCurrency ? minRMAmount : 0.1;

                  return (
                    <Button
                      variant="default"
                      className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
                      onClick={show}
                      disabled={
                        isDebouncing ||
                        loading ||
                        !paymentAmount ||
                        parseFloat(paymentAmount) < minAmount ||
                        isNaN(parseFloat(paymentAmount)) ||
                        paymentState !== "preview"
                      }
                      size="lg"
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                      Pay ${isNaN(parseFloat(usdAmount)) ? "0.00" : usdAmount}{" "}
                      with Crypto
                    </Button>
                  );
                }}
              </RozoPayButton.Custom>

              {/* Pay with Points Button */}
              {points > 0 && (
                <div className="space-y-2">
                  <Button
                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
                    size="lg"
                    onClick={handlePayWithPoints}
                    variant="outline"
                    disabled={
                      !paymentAmount ||
                      parseFloat(paymentAmount) <
                        (isRMCurrency ? minRMAmount : 0.1) ||
                      isNaN(parseFloat(paymentAmount)) ||
                      points < parseFloat(convertToUSD(paymentAmount))
                    }
                  >
                    <Coins className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Pay with{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "decimal",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      isNaN(parseFloat(convertToUSD(paymentAmount || "0")))
                        ? 0
                        : parseFloat(convertToUSD(paymentAmount || "0")) * 100
                    )}{" "}
                    Points
                  </Button>
                  <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                    Available Points:{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "decimal",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format((points ?? 0) * 100)}{" "}
                    pts
                    <CustomTooltip
                      content="Explore all the benefits of Rozo. Rozo points are the rewards for your purchases."
                      position="top"
                      className="w-[12rem] sm:w-[20rem] ml-1.5"
                    >
                      <HelpCircle className="ml-3 h-3 w-3 cursor-help text-muted-foreground hover:text-foreground transition-colors" />
                    </CustomTooltip>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Support */}
          <ContactSupport />
        </CardContent>
      </Card>

      {/* Pay with Points Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment with Points</DialogTitle>
            <DialogDescription>
              You are about to pay for{" "}
              <span className="font-medium text-foreground">
                {restaurant?.name}
              </span>{" "}
              using your Rozo Points.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              {isRMCurrency && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Amount ({getDisplayCurrency()}):
                  </span>
                  <span className="font-medium text-foreground">
                    {getDisplayCurrency()} {paymentAmount}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Points to be used:
                </span>
                <span className="font-semibold text-foreground">
                  {paymentAmount &&
                    new Intl.NumberFormat("en-US", {
                      style: "decimal",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      parseFloat(convertToUSD(paymentAmount)) * 100
                    )}{" "}
                  pts
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Available Points:
                </span>
                <span className="font-medium text-muted-foreground">
                  {new Intl.NumberFormat("en-US", {
                    style: "decimal",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format((points ?? 0) * 100)}{" "}
                  pts
                </span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Remaining Points:
                </span>
                <span className="font-semibold text-foreground">
                  {paymentAmount &&
                    new Intl.NumberFormat("en-US", {
                      style: "decimal",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      (points - parseFloat(convertToUSD(paymentAmount))) * 100
                    )}{" "}
                  pts
                </span>
              </div>
              {isRMCurrency && getExchangeRate() && (
                <>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-center">
                    <span className="text-xs text-muted-foreground">
                      Exchange rate: 1 RM = {getExchangeRate()} USD
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={dialogLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPaymentWithPoints}
              disabled={dialogLoading}
              className="w-full sm:w-auto"
            >
              {dialogLoading ? (
                <>
                  <Wallet className="h-4 w-4 animate-pulse mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
