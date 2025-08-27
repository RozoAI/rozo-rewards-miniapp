"use client";

import { ContactSupport } from "@/components/contact-support";
import { PageHeader } from "@/components/page-header";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRozoPointAPI } from "@/hooks/useRozoPointAPI";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { baseUSDC, PaymentCompletedEvent } from "@rozoai/intent-common";
import { RozoPayButton, useRozoPay, useRozoPayUI } from "@rozoai/intent-pay";

import {
  BadgePercent,
  Coins,
  CreditCard,
  HelpCircle,
  Loader2,
  MapPin,
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

  const [restaurant, setRestaurant] = React.useState<Restaurant | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState<string>("0.00");
  const [points, setPoints] = React.useState(0);
  const [pointsLoading, setPointsLoading] = React.useState(false);
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
        const price = Number(foundRestaurant.price ?? 0);
        setPaymentAmount(price.toFixed(2));
        resetPayment({
          intent: `${foundRestaurant.name} - ${price}`,
          toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
          toChain: baseUSDC.chainId,
          toToken: baseUSDC.token as `0x${string}`,
          toUnits: price.toString(),
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
      resetPayment({
        intent: `Pay for ${restaurant.name} - $${value}`,
        toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
        toChain: baseUSDC.chainId,
        toToken: baseUSDC.token as `0x${string}`,
        toUnits: value, // Keep the original value instead of converting to number
      });
      setIsDebouncing(false);
      debounceTimerRef.current = null;
    }, 500);
  };

  const handlePayWithPoints = async () => {
    if (!address || !restaurant || !paymentAmount) return;

    setPaymentLoading(true);

    const signature = await spendPoints({
      from_address: address,
      to_handle: restaurant.name.toLowerCase().replace(/\s+/g, ""),
      amount_usd_cents: parseFloat(paymentAmount) * 100,
      amount_local: parseFloat(paymentAmount),
      currency_local: "USD",
      timestamp: Date.now(),
      order_id: Date.now().toString(),
      about: `Pay for ${restaurant.name} - $${paymentAmount}`,
    });

    if (signature) {
      toast.success("Points spent successfully");
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } else {
      toast.error("Failed to spend points");
    }

    setPaymentLoading(false);
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
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2 mb-6">
            {!!restaurant.ns_id && (
              <div className="space-y-3">
                {/* Amount Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="payment-amount"
                    className="text-sm font-medium"
                  >
                    Payment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      min="0.10"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="pl-8 h-11 sm:h-12 text-sm sm:text-base"
                    />
                  </div>
                  {paymentAmount && parseFloat(paymentAmount) < 0.1 && (
                    <p className="text-xs text-destructive">
                      Minimum amount is $0.10 USD
                    </p>
                  )}
                </div>

                {/* Payment Button */}
                <RozoPayButton.Custom
                  closeOnSuccess
                  resetOnSuccess
                  appId={"rozoRewards"}
                  toAddress={
                    (restaurant.payTo ??
                      "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897") as `0x${string}`
                  }
                  toChain={baseUSDC.chainId}
                  {...(paymentAmount && parseFloat(paymentAmount) > 0.1
                    ? {
                        toUnits: paymentAmount,
                      }
                    : {})}
                  toToken={baseUSDC.token as `0x${string}`}
                  intent={`Pay for ${restaurant.name} - $${paymentAmount}`}
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
                      window.location.href = `https://invoice.rozo.ai/receipt?id=${args.payment.id}&back_url=${window.location.href}`;
                    }, 2000);
                  }}
                >
                  {({ show }) => (
                    <Button
                      variant="default"
                      className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
                      onClick={show}
                      disabled={
                        isDebouncing ||
                        loading ||
                        !paymentAmount ||
                        parseFloat(paymentAmount) < 0.1 ||
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
                      Pay $
                      {isNaN(parseFloat(paymentAmount))
                        ? "0.00"
                        : paymentAmount}{" "}
                      with Crypto
                    </Button>
                  )}
                </RozoPayButton.Custom>

                {/* Pay with Points Button */}
                {points > 0 ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
                      size="lg"
                      onClick={handlePayWithPoints}
                      variant="outline"
                      disabled={
                        paymentLoading ||
                        !paymentAmount ||
                        parseFloat(paymentAmount) < 0.1 ||
                        isNaN(parseFloat(paymentAmount)) ||
                        points < parseFloat(paymentAmount)
                      }
                    >
                      {paymentLoading ? (
                        <>
                          <Coins className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <Coins className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Pay with{" "}
                          {new Intl.NumberFormat("en-US", {
                            style: "decimal",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(
                            isNaN(parseFloat(paymentAmount || "0"))
                              ? 0
                              : parseFloat(paymentAmount || "0") * 100
                          )}{" "}
                          Points
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                      Available Points{" "}
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Explore all the benefits of Rozo. Rozo points are the
                          rewards for your purchases.
                        </TooltipContent>
                      </Tooltip>
                      :{" "}
                      {new Intl.NumberFormat("en-US", {
                        style: "decimal",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format((points ?? 0) * 100)}{" "}
                      pts
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No points available. Make a purchase to start earning
                    rewards.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Contact & Support */}
          <ContactSupport />
        </CardContent>
      </Card>
    </div>
  );
}
