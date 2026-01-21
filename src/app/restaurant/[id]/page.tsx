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
import { useBookmarks } from "@/contexts/BookmarkContext";
import { useRozoPointAPI } from "@/hooks/useRozoPointAPI";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import {
  convertToUSD,
  EXCHANGE_RATES,
  getDisplayCurrency,
  getFirstTwoWordInitialsFromName,
} from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { useComposeCast, useIsInMiniApp } from "@coinbase/onchainkit/minikit";
import {
  baseUSDC,
  createPayment,
  PaymentCompletedEvent,
  rozoStellarUSDC,
} from "@rozoai/intent-common";
import { RozoPayButton, useRozoPay, useRozoPayUI } from "@rozoai/intent-pay";

import { PaymentData } from "@/app/receipt/receipt-content";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  BadgePercent,
  Bookmark,
  ChevronDown,
  ChevronUp,
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
import React, { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import data from "../../../../public/coffee_mapdata.json";

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id as string;
  const { resetPayment } = useRozoPayUI();
  const { paymentState } = useRozoPay();
  const { getPoints, spendPoints } = useRozoPointAPI();
  const { address, isConnected } = useAppKitAccount();
  const { isInMiniApp } = useIsInMiniApp();
  const { composeCast } = useComposeCast();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const {
    isAvailable: isRozoWalletAvailable,
    isConnected: isRozoWalletConnected,
    walletAddress: rozoWalletAddress,
    balance: rozoWalletBalance,
    isLoading: rozoWalletLoading,
    transferUSDC: rozoWalletTransfer,
    refreshData: refreshRozoWallet,
  } = useRozoWallet();

  const [restaurant, setRestaurant] = React.useState<Restaurant | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState<string>("");
  const [points, setPoints] = React.useState(0);
  const [pointsLoading, setPointsLoading] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [dialogLoading, setDialogLoading] = React.useState(false);
  const [showFullAddress, setShowFullAddress] = React.useState(false);
  const [isRozoWalletPaymentLoading, setIsRozoWalletPaymentLoading] =
    React.useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastResetAmountRef = useRef<string>("");
  const [appId, setAppId] = React.useState<string>("");

  const merchantOrderId = `${restaurant?.handle.toUpperCase()}-${new Date().getTime()}`;
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
    async function loadRestaurant() {
      try {
        // const res = await fetch("/coffee_mapdata.json", { cache: "no-store" });
        // if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        // const data = await res.json();

        const foundRestaurant = data.locations.find(
          (loc) =>
            typeof loc === "object" &&
            loc !== null &&
            "_id" in loc &&
            loc._id === restaurantId
        );
        if (!foundRestaurant) {
          throw new Error("Restaurant not found");
        }

        setRestaurant(foundRestaurant as Restaurant);

        let price = 0;
        if (foundRestaurant.price && !isNaN(Number(foundRestaurant.price))) {
          price = Number(foundRestaurant.price);
          setPaymentAmount(price.toFixed(2));
        }

        const displayCurrency = foundRestaurant.currency || "USD";
        const usdAmount = convertToUSD(price.toFixed(2), displayCurrency);

        const appId = `rozoRewardsBNBStellarMP-${foundRestaurant.handle || ""}`;
        setAppId(appId);

        resetPayment({
          appId: appId,
          intent: `${foundRestaurant.name} - ${displayCurrency} ${price.toFixed(
            2
          )}`,
          toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
          toChain: baseUSDC.chainId,
          toToken: baseUSDC.token as `0x${string}`,
          toUnits: usdAmount,
          metadata: generateMetadata(price.toFixed(2), displayCurrency) as any,
        });

        // Store initial amount to prevent unnecessary resets
        lastResetAmountRef.current = price.toFixed(2);
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
      const displayCurrency = getDisplayCurrency(restaurant.currency);
      const usdAmount = convertToUSD(value, displayCurrency);

      const appId = `rozoRewardsBNBStellarMP-${restaurant.handle || ""}`;
      setAppId(appId);

      resetPayment({
        appId: appId,
        intent: `Pay for ${restaurant.name} - ${displayCurrency}${value} ($${usdAmount})`,
        toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
        toChain: baseUSDC.chainId,
        toToken: baseUSDC.token as `0x${string}`,
        toUnits: usdAmount, // Use USD amount for payment processing
        metadata: generateMetadata(value, displayCurrency) as any,
      });
      setIsDebouncing(false);
      debounceTimerRef.current = null;
    }, 500);
  };

  const handlePayWithPoints = () => {
    setShowConfirmDialog(true);
  };

  const confirmPaymentWithPoints = async () => {
    try {
      if (!address || !restaurant || !paymentAmount) return;

      setDialogLoading(true);

      const displayCurrency = getDisplayCurrency(restaurant?.currency);
      const usdAmount = convertToUSD(paymentAmount, displayCurrency);

      const paymentData = {
        from_address: address,
        to_handle:
          restaurant.handle ||
          restaurant.name.toLowerCase().replace(/\s+/g, ""),
        amount_usd_cents: parseFloat(usdAmount) * 100,
        amount_local: parseFloat(paymentAmount),
        currency_local: displayCurrency,
        timestamp: Date.now(),
        order_id: merchantOrderId,
        about: `Pay for ${restaurant.name} - $${paymentAmount}`,
      };
      router.prefetch("/receipt");
      const response = await spendPoints(paymentData);

      if (response && response.status === "success") {
        // Store payment data in sessionStorage for receipt page
        const receiptData: PaymentData = {
          ...response.data,
          restaurant_name: restaurant.name,
          restaurant_address: restaurant.address_line1,
          is_using_points: true,
        };

        sessionStorage.setItem("payment_receipt", JSON.stringify(receiptData));

        setShowConfirmDialog(false);
        toast.success("Points spent successfully");
        // Navigate to receipt page
        router.push("/receipt");
      } else {
        toast.error("Failed to spend points");
        setDialogLoading(false);
      }
    } catch {
      toast.error("Failed to spend points");
      setDialogLoading(false);
    }
  };

  // Pay with Rozo Wallet (Stellar USDC)
  // Only shown when page is opened in Rozo Wallet mobile app
  // Uses window.rozo provider for gasless USDC transfers
  const generateBridgeAddress = async (
    amount: string
  ): Promise<{
    amount: string;
    bridgeAddress: string;
    memo: string;
    receiverAddressContract?: string;
receiverMemoContract?: string;
  }> => {
    const displayCurrency = getDisplayCurrency(restaurant?.currency);

    const payment = await createPayment({
      appId: appId,
      toAddress: toAddress,
      toChain: baseUSDC.chainId,
      toToken: baseUSDC.token,
      toUnits: amount,
      preferredChain: rozoStellarUSDC.chainId,
      preferredTokenAddress: rozoStellarUSDC.token,
      metadata: generateMetadata(amount, displayCurrency) as any,
      title: `Pay for ${restaurant?.name} - $${amount}`,
    });

    if (
      !payment.source.receiverAddress ||
      !payment.source.amount ||
      !payment.source.receiverMemo
    ) {
      throw new Error("Failed to generate bridge address");
    }

    return {
      amount: payment.source.amount,
      bridgeAddress: payment.source.receiverAddress,
      memo: payment.source.receiverMemo,
      receiverAddressContract: payment.source.receiverAddressContract,
      receiverMemoContract: payment.source.receiverMemoContract,
    };
  };

  const handlePayWithRozoWallet = async () => {
    if (!restaurant || !paymentAmount) return;

    try {
      setIsRozoWalletPaymentLoading(true);

      const displayCurrency = getDisplayCurrency(restaurant.currency);
      const usdAmount = convertToUSD(paymentAmount, displayCurrency);

      // Transfer USDC on Stellar network
      const { amount, receiverAddressContract, receiverMemoContract } =
        await generateBridgeAddress(usdAmount);

      const result = await rozoWalletTransfer(amount, receiverAddressContract, receiverMemoContract);

      if (result.hash) {
        // Store receipt data
        const receiptData: PaymentData = {
          from_address: rozoWalletAddress || "",
          to_handle:
            restaurant.handle ||
            restaurant.name.toLowerCase().replace(/\s+/g, ""),
          amount_usd_cents: parseFloat(usdAmount) * 100,
          amount_local: parseFloat(paymentAmount),
          currency_local: displayCurrency,
          timestamp: Date.now(),
          order_id: merchantOrderId,
          about: `Pay for ${restaurant.name} - ${displayCurrency} ${paymentAmount}`,
          restaurant_name: restaurant.name,
          restaurant_address: restaurant.address_line1,
          is_using_points: false,
        };

        sessionStorage.setItem("payment_receipt", JSON.stringify(receiptData));

        toast.success(`Payment successful to ${restaurant.name}!`);
        router.push("/receipt?withRozoWallet=true");
      }
    } catch (error: any) {
      console.error("Rozo Wallet payment error:", error);

      if (error.message.includes("User rejected")) {
        toast.error("Payment cancelled");
      } else if (error.message.includes("Insufficient balance")) {
        toast.error("Insufficient USDC balance");
      } else {
        toast.error(
          `Payment failed. Please try again. Message: ${error.message}`
        );
      }
    } finally {
      setIsRozoWalletPaymentLoading(false);
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

  const handleBookmark = () => {
    if (restaurant) {
      toggleBookmark({
        id: restaurant._id,
        title: restaurant.name,
        logo_url: restaurant.logo_url,
        url: `/restaurant/${restaurant._id}`,
      });
      toast.success(
        isBookmarked(restaurant._id)
          ? "Removed from bookmarks"
          : "Added to bookmarks"
      );
    }
  };

  const handleClearPayment = () => {
    setPaymentAmount("");
    setPaymentLoading(false);
  };

  const handlePaymentCompleted = (args: PaymentCompletedEvent) => {
    if (!restaurant) return;

    // Prefetch and navigate to receipt page
    router.prefetch("/receipt");

    toast.success(`Payment successful to ${restaurant.name}!`, {
      description:
        "Your payment has been processed successfully. Redirecting to receipt...",
      duration: 2000,
    });

    // Store payment data in sessionStorage for receipt page
    const displayCurrency = getDisplayCurrency(restaurant?.currency);
    const usdAmount = convertToUSD(paymentAmount, displayCurrency);

    const receiptData: PaymentData = {
      from_address: address || "",
      to_handle:
        restaurant.handle || restaurant.name.toLowerCase().replace(/\s+/g, ""),
      amount_usd_cents: parseFloat(usdAmount) * 100,
      amount_local: parseFloat(paymentAmount),
      currency_local: displayCurrency,
      timestamp: Date.now(),
      order_id: merchantOrderId,
      about: `Pay for ${restaurant.name} - ${displayCurrency} ${paymentAmount}`,
      restaurant_name: restaurant.name,
      restaurant_address: restaurant.address_line1,
      is_using_points: false,
    };

    sessionStorage.setItem("payment_receipt", JSON.stringify(receiptData));

    setTimeout(() => {
      handleClearPayment();
      setLoading(false);
      router.push("/receipt");
    }, 2000);
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
        <PageHeader title="Back to DApps" isBackButton />
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
              <div className="flex items-start gap-2 text-muted-foreground group">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 group-hover:text-blue-600 transition-colors" />
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
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
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
                        Exchange rate: 1{" "}
                        {getDisplayCurrency(restaurant?.currency)} ={" "}
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
                  <div className="space-y-2">
                    {/* Balance Display */}
                    {rozoWalletBalance && (
                      <p className="text-xs text-muted-foreground text-center">
                        Rozo Wallet Balance: {rozoWalletBalance} USDC (Stellar)
                      </p>
                    )}

                    {/* Pay with Rozo Wallet Button */}
                    <Button
                      variant="default"
                      className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
                      onClick={handlePayWithRozoWallet}
                      disabled={
                        isRozoWalletPaymentLoading ||
                        !paymentAmount ||
                        parseFloat(paymentAmount) <= 0 ||
                        isNaN(parseFloat(paymentAmount))
                      }
                      size="lg"
                    >
                      {isRozoWalletPaymentLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                      Pay $
                      {isNaN(
                        parseFloat(
                          convertToUSD(
                            paymentAmount || "0",
                            getDisplayCurrency(restaurant?.currency)
                          )
                        )
                      )
                        ? "0.00"
                        : convertToUSD(
                            paymentAmount || "0",
                            getDisplayCurrency(restaurant?.currency)
                          )}{" "}
                      with Rozo Wallet
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Original Payment Buttons - ONLY shown when Rozo Wallet NOT available */}

                    {/* Payment Button */}
                    <RozoPayButton.Custom
                      resetOnSuccess
                      appId={appId}
                      toAddress={toAddress}
                      toChain={baseUSDC.chainId}
                      {...(paymentAmount && parseFloat(paymentAmount) > 0
                        ? {
                            toUnits: convertToUSD(
                              paymentAmount,
                              getDisplayCurrency(restaurant?.currency)
                            ),
                          }
                        : {})}
                      toToken={baseUSDC.token}
                      intent={`Pay for ${restaurant.name} - ${getDisplayCurrency(
                        restaurant?.currency
                      )} ${paymentAmount}`}
                      onPaymentStarted={() => {
                        setLoading(true);
                        setPaymentLoading(true);
                      }}
                      onPaymentCompleted={handlePaymentCompleted}
                    >
                      {({ show }) => {
                        const usdAmount = convertToUSD(
                          paymentAmount,
                          getDisplayCurrency(restaurant?.currency)
                        );

                        return (
                          <Button
                            variant="default"
                            className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
                            onClick={show}
                            disabled={
                              isDebouncing ||
                              loading ||
                              !paymentAmount ||
                              parseFloat(paymentAmount) <= 0 ||
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
                            {isNaN(parseFloat(usdAmount)) ? "0.00" : usdAmount}{" "}
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
                            parseFloat(paymentAmount) <= 0 ||
                            isNaN(parseFloat(paymentAmount)) ||
                            points <
                              parseFloat(
                                convertToUSD(
                                  paymentAmount,
                                  getDisplayCurrency(restaurant?.currency)
                                )
                              )
                          }
                        >
                          <Coins className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Pay with{" "}
                          {new Intl.NumberFormat("en-US", {
                            style: "decimal",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(
                            isNaN(
                              parseFloat(
                                convertToUSD(
                                  paymentAmount || "0",
                                  getDisplayCurrency(restaurant?.currency)
                                )
                              )
                            )
                              ? 0
                              : parseFloat(
                                  convertToUSD(
                                    paymentAmount || "0",
                                    getDisplayCurrency(restaurant?.currency)
                                  )
                                ) * 100
                          )}{" "}
                          Points
                        </Button>
                        <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                          Available Points:{" "}
                          {Number((points ?? 0) * 100).toFixed(2)} pts
                          <CustomTooltip
                            content="Explore all the benefits of Rozo. Rozo points are the rewards for your purchases."
                            position="top"
                            className="w-48 sm:w-[20rem] ml-1.5"
                          >
                            <HelpCircle className="ml-3 h-3 w-3 cursor-help text-muted-foreground hover:text-foreground transition-colors" />
                          </CustomTooltip>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

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
              {getDisplayCurrency(restaurant?.currency) !== "USD" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Amount ({getDisplayCurrency(restaurant?.currency)}):
                    </span>
                    <span className="font-medium text-foreground">
                      {getDisplayCurrency(restaurant?.currency)} {paymentAmount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      USD Equivalent:
                    </span>
                    <span className="font-medium text-foreground">
                      ${" "}
                      {convertToUSD(
                        paymentAmount,
                        getDisplayCurrency(restaurant?.currency)
                      )}
                    </span>
                  </div>
                </>
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
                      parseFloat(
                        convertToUSD(
                          paymentAmount,
                          getDisplayCurrency(restaurant?.currency)
                        )
                      ) * 100
                    )}{" "}
                  pts
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Available Points:
                </span>
                <span className="font-medium text-muted-foreground">
                  {Number((points ?? 0) * 100).toFixed(2)} pts{" "}
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
                      (points -
                        parseFloat(
                          convertToUSD(
                            paymentAmount,
                            getDisplayCurrency(restaurant?.currency)
                          )
                        )) *
                        100
                    )}{" "}
                  pts
                </span>
              </div>
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
