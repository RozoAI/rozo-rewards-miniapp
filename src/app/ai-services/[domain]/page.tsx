"use client";

import { PaymentData } from "@/app/receipt/receipt-content";
import { ContactSupport } from "@/components/contact-support";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { useRozoPointAPI } from "@/hooks/useRozoPointAPI";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { getAiServiceById } from "@/lib/ai-services";
import { savePaymentReceipt } from "@/lib/payment-storage";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { useComposeCast, useIsInMiniApp } from "@coinbase/onchainkit/minikit";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  baseUSDC,
  createPayment,
  PaymentCompletedEvent,
  rozoStellarUSDC,
} from "@rozoai/intent-common";
import { RozoPayButton, useRozoPayUI } from "@rozoai/intent-pay";
import {
  Bookmark,
  Coins,
  CreditCard,
  HelpCircle,
  MessageCircle,
  Share,
  Wallet,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

const toAddress = "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897";

export default function AIServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.domain as string;
  const { isInMiniApp } = useIsInMiniApp();

  const { composeCast } = useComposeCast();
  const { resetPayment } = useRozoPayUI();
  const { getPoints, spendPoints } = useRozoPointAPI();
  const { address, isConnected } = useAppKitAccount();
  const {
    isAvailable: isRozoWalletAvailable,
    isConnected: isRozoWalletConnected,
    walletAddress: rozoWalletAddress,
    balance: rozoWalletBalance,
    transferUSDC: rozoWalletTransfer,
  } = useRozoWallet();

  const [service, setService] =
    React.useState<ReturnType<typeof getAiServiceById>>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = React.useState(false);
  const [points, setPoints] = React.useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [dialogLoading, setDialogLoading] = React.useState(false);
  const [isRozoWalletPaymentLoading, setIsRozoWalletPaymentLoading] =
    React.useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);
  const [appId, setAppId] = React.useState<string>("");
  const [userEmail, setUserEmail] = React.useState<string>("");
  const [emailError, setEmailError] = React.useState<string>("");
  const hasAutoOpenedIntercomRef = useRef(false);

  const { toggleBookmark, isBookmarked } = useBookmarks();

  const merchantOrderId = useMemo(
    () => `${(service?.id || "service").toUpperCase()}-${Date.now()}`,
    [service?.id],
  );
  const receiptUrl = `https://ns.rozo.ai/payment/success?order_id=${merchantOrderId}`;
  const priceUsd = service?.price_usd ?? 0;
  const hasPrice = typeof service?.price_usd === "number";
  const hasDiscount =
    typeof service?.price_usd === "number" &&
    typeof service?.original_price_usd === "number" &&
    service.original_price_usd > service.price_usd;
  const discountPercent = hasDiscount
    ? Math.round(
        ((service.original_price_usd! - service.price_usd!) /
          service.original_price_usd!) *
          100,
      )
    : null;

  // Prefer Rozo Wallet account when available, otherwise fall back to EVM account
  const activeAddress =
    (isRozoWalletConnected && rozoWalletAddress) ||
    (isConnected && address) ||
    "";

  const metadata = useMemo(() => {
    const baseMetadata = {
      amount_local: service?.price_usd,
      currency_local: "USD",
      email: userEmail,
      items: [
        {
          name: service?.name,
          description: `${service?.price_usd ?? "N/A"} USD`,
        },
      ],
    };

    if (service?.id) {
      return {
        ...baseMetadata,
        merchant_order_id: merchantOrderId,
        ...(service?.sold_out ? { receiptUrl: receiptUrl } : {}),
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
  }, [
    service?.price_usd,
    service?.name,
    service?.id,
    service?.sold_out,
    userEmail,
    merchantOrderId,
    receiptUrl,
  ]);

  useEffect(() => {
    async function loadService() {
      try {
        const foundService = getAiServiceById(serviceId);
        if (!foundService) {
          throw new Error("AI Service not found");
        }

        setService(foundService);

        const appId = `rozoRewardsBNBStellarMP-zen`;
        setAppId(appId);

        await resetPayment({
          appId: appId,
          intent: `Pay for ${foundService.name}`,
          toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
          toChain: baseUSDC.chainId,
          toToken: baseUSDC.token as `0x${string}`,
          ...(typeof foundService.price_usd === "number" && {
            toUnits: foundService.price_usd.toString(),
          }),
          metadata: metadata as any,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (serviceId) {
      loadService();
    }
  }, [serviceId, userEmail, metadata]);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!address || !isConnected) return;

      const points = await getPoints(address);
      setPoints(points / 100);
    };
    fetchPoints();
  }, [isConnected, address, getPoints]);

  // Update payment metadata when email changes (but only after initial load)
  useEffect(() => {
    if (userEmail && service && appId) {
      resetPayment({
        appId: appId,
        intent: `Pay for ${service.name}`,
        toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
        toChain: baseUSDC.chainId,
        toToken: baseUSDC.token as `0x${string}`,
        ...(typeof service.price_usd === "number" && {
          toUnits: service.price_usd.toString(),
        }),
        metadata: metadata as any,
      });
    }
  }, [userEmail, service, appId, metadata]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateEmailInput = () => {
    if (!userEmail.trim()) {
      setEmailError("Email address is required");
      return false;
    }

    if (!validateEmail(userEmail)) {
      setEmailError("Please enter a valid email address");
      return false;
    }

    setEmailError("");
    return true;
  };

  const handlePayWithPoints = () => {
    if (!validateEmailInput()) {
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmPaymentWithPoints = async () => {
    if (!address || !service) return;

    setDialogLoading(true);

    const paymentData = {
      from_address: address,
      to_handle: service.id,
      amount_usd_cents: priceUsd * 100,
      amount_local: priceUsd,
      currency_local: "USD",
      timestamp: Date.now(),
      order_id: merchantOrderId,
      about: `Pay for ${service.name}`,
    };

    const response = await spendPoints(paymentData);

    if (response && response.status === "success") {
      // Store payment data in localStorage for receipt page
      const receiptData = {
        ...response.data,
        service_name: service.name,
        service_domain: service.id,
        is_using_points: true,
      };

      console.log("[AI Services] Pay with Points - About to save receipt:", {
        merchantOrderId,
        receiptData,
      });
      savePaymentReceipt(merchantOrderId, receiptData);
      console.log(
        "[AI Services] Pay with Points - Receipt saved, navigating to /receipt?payment_id=" +
          merchantOrderId,
      );

      setShowConfirmDialog(false);

      // Navigate to receipt page
      router.push(`/receipt?payment_id=${merchantOrderId}`);
    } else {
      toast.error("Failed to spend points");
      setDialogLoading(false);
    }
  };

  // Pay with Rozo Wallet (Stellar USDC)
  // Only shown when page is opened in Rozo Wallet mobile app
  // Uses window.rozo provider for gasless USDC transfers

  const generateBridgeAddress = async (
    amount: string,
  ): Promise<{
    amount: string;
    bridgeAddress: string;
    memo: string;
    receiverAddressContract?: string;
    receiverMemoContract?: string;
  }> => {
    const payment = await createPayment({
      appId: appId,
      toAddress: toAddress,
      toChain: baseUSDC.chainId,
      toToken: baseUSDC.token,
      toUnits: amount,
      preferredChain: rozoStellarUSDC.chainId,
      preferredTokenAddress: rozoStellarUSDC.token,
      metadata: metadata as any,
      title: `Pay for ${service?.name}`,
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
    if (!service || !validateEmailInput()) return;

    try {
      setIsRozoWalletPaymentLoading(true);

      if (typeof service.price_usd !== "number") {
        toast.error("Price unavailable for this service");
        return;
      }
      const usdAmount = service.price_usd.toString();

      const { amount, receiverAddressContract, receiverMemoContract } =
        await generateBridgeAddress(usdAmount);

      const result = await rozoWalletTransfer(
        amount,
        receiverAddressContract,
        receiverMemoContract,
      );

      if (result.hash) {
        // Store receipt data
        const receiptData = {
          from_address: rozoWalletAddress || "",
          to_handle: service.id,
          amount_usd_cents: priceUsd * 100,
          amount_local: priceUsd,
          currency_local: "USD",
          timestamp: Date.now(),
          order_id: merchantOrderId,
          about: `Pay for ${service.name}`,
          service_name: service.name,
          service_domain: service.id,
          is_using_points: false,
        };

        console.log(
          "[AI Services] Pay with Rozo Wallet - About to save receipt:",
          {
            merchantOrderId,
            receiptData,
          },
        );
        savePaymentReceipt(merchantOrderId, receiptData);
        console.log(
          "[AI Services] Pay with Rozo Wallet - Receipt saved, navigating to /receipt?payment_id=" +
            merchantOrderId,
        );

        toast.success(`Payment successful to ${service.name}!`);
        router.push(`/receipt?payment_id=${merchantOrderId}`);
      }
    } catch (error: any) {
      console.error("Rozo Wallet payment error:", error);

      if (error.message.includes("User rejected")) {
        toast.error("Payment cancelled");
      } else if (error.message.includes("Insufficient balance")) {
        toast.error("Insufficient USDC balance");
      } else {
        toast.error("Payment failed. Please try again.");
      }
    } finally {
      setIsRozoWalletPaymentLoading(false);
    }
  };

  const handleShare = () => {
    const text = `Check out ${service?.name} for ${hasPrice ? `$${service?.price_usd}` : "N/A"}! ${service?.description}.`;

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
    if (service) {
      toggleBookmark({
        id: service.id,
        title: service.name,
        logo_url: service.logoUrl,
        url: `/ai-services/${service.id}`,
      });
      toast.success(
        isBookmarked(service.id)
          ? "Removed from bookmarks"
          : "Added to bookmarks",
      );
    }
  };

  const openIntercomWithMessage = useCallback(
    (retryCount = 0) => {
      const message = service
        ? `Hi, I want to buy ${service.name}.`
        : "Hi, I want to buy this service.";

      if (typeof window.Intercom === "function") {
        window.Intercom("showNewMessage", message);
        return;
      }

      if (retryCount < 4) {
        setTimeout(() => openIntercomWithMessage(retryCount + 1), 600);
      }
    },
    [service],
  );

  useEffect(() => {
    if (!service?.id) return;
    if (hasAutoOpenedIntercomRef.current) return;

    hasAutoOpenedIntercomRef.current = true;
    openIntercomWithMessage();
  }, [service?.id, openIntercomWithMessage]);

  const handlePaymentCompleted = (_args: PaymentCompletedEvent) => {
    if (!service) return;

    toast.success(`Payment successful to ${service.name}!`, {
      description:
        "Your payment has been processed successfully. Redirecting to receipt...",
      duration: 2000,
    });

    // Store payment data in localStorage for receipt page
    const receiptData: PaymentData = {
      from_address: address || "",
      to_handle: service.id,
      amount_usd_cents: priceUsd * 100,
      amount_local: priceUsd,
      currency_local: "USD",
      timestamp: Date.now(),
      order_id: merchantOrderId,
      about: `Pay for ${service.name}`,
      service_name: service.name,
      service_domain: service.id,
      is_using_points: false,
    };

    console.log("[AI Services] Pay with Crypto - About to save receipt:", {
      merchantOrderId,
      receiptData,
    });
    savePaymentReceipt(merchantOrderId, receiptData);
    console.log(
      "[AI Services] Pay with Crypto - Receipt saved, navigating to /receipt?payment_id=" +
        merchantOrderId,
    );

    // Prefetch and navigate to receipt page
    router.prefetch("/receipt");
    setTimeout(() => {
      router.push(`/receipt?payment_id=${merchantOrderId}`);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <PageHeader title="Back to Discovery" isBackButton />
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

  if (error || !service) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <PageHeader title="Back to Discovery" isBackButton />
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-destructive text-lg font-medium mb-2">
              {error || "AI Service not found"}
            </p>
            <p className="text-muted-foreground mb-4">
              The AI service you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
            <Button onClick={() => router.push("/discovery")} variant="outline">
              Back to Discovery
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = getFirstTwoWordInitialsFromName(service.name);

  return (
    <div className="w-full mb-20 flex flex-col gap-4 sm:gap-6 mt-4 px-3 sm:px-4 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Back to Discovery"
        isBackButton
        paymentHistoryAddress={activeAddress}
      />

      {/* Service Info Card */}
      <Card className="w-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm shadow-sm gap-0">
        <CardHeader className="space-y-4 pb-5">
          <div className="rounded-xl border border-border/60 bg-muted/20">
            <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border border-border/50 bg-background/70 aspect-video">
              <Avatar className="size-full rounded-none">
                {service.logoUrl ? (
                  <AvatarImage
                    src={service.logoUrl}
                    alt={service.name}
                    className="object-contain p-4 sm:p-6"
                  />
                ) : null}
                <AvatarFallback
                  title={service.name}
                  className="font-semibold text-2xl bg-linear-to-br from-primary/10 to-primary/5 text-primary"
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="space-y-1.5 flex flex-row items-start justify-between">
            <div>
              <h2
                className="text-xl sm:text-2xl font-bold leading-tight"
                title={service.name}
              >
                {service.name}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {service.long_description}
              </p>
            </div>
            {/* Top right positioning for larger screens */}
            <div className="mt-2 sm:mt-0 sm:ml-4 sm:self-start">
              <div className="flex items-center justify-end gap-2">
                <Button
                  onClick={handleBookmark}
                  variant={isBookmarked(service.id) ? "default" : "outline"}
                  size="icon"
                  title={
                    isBookmarked(service.id)
                      ? "Remove from bookmarks"
                      : "Add to bookmarks"
                  }
                >
                  <Bookmark
                    className={`size-4 ${
                      isBookmarked(service.id) ? "fill-current" : ""
                    }`}
                  />
                </Button>
                <Button onClick={handleShare} variant="default" size="icon">
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 pt-0">
          <div className="rounded-lg border border-primary/20 bg-muted/20 p-3 sm:p-4">
            <div className="space-y-1">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Offer Value
                </p>
                {hasDiscount && (
                  <p className="text-xs text-muted-foreground line-through">
                    ${service.original_price_usd}
                  </p>
                )}
                <div className="flex items-end gap-1.5">
                  <p className="text-2xl font-bold leading-none text-foreground sm:text-3xl">
                    {hasPrice ? `$${service.price_usd}` : "N/A"}
                  </p>
                  {hasDiscount && discountPercent !== null && (
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      -{discountPercent}%
                    </span>
                  )}
                </div>
                <p className="text-xs leading-snug text-muted-foreground">
                  {service.description}
                </p>
              </div>
              {/* <Badge
                variant={service.sold_out ? "outline" : "secondary"}
                className="text-xs font-semibold"
              >
                {service.sold_out ? "Sold Out" : "Available"}
              </Badge> */}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => openIntercomWithMessage()}
            >
              <MessageCircle className="size-4" />
              Please Chat before placing order
            </Button>
            {!service.sold_out && !showPaymentOptions && (
              <Button
                type="button"
                className="w-full"
                onClick={() => setShowPaymentOptions(true)}
              >
                <CreditCard className="size-4" />
                Pay
              </Button>
            )}

            {showPaymentOptions && (
              <>
                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={userEmail}
                    onChange={(e) => {
                      setUserEmail(e.target.value);
                      setEmailError("");
                    }}
                    className={emailError ? "border-destructive" : ""}
                  />
                  {/* {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )} */}
                  <p className="text-xs text-muted-foreground">
                    Required for payment confirmation and receipt delivery
                  </p>
                </div>

                {/* Payment Buttons - Conditional based on Rozo Wallet availability */}
                {!service.sold_out &&
                  (isRozoWalletAvailable && isRozoWalletConnected ? (
                    // Pay with Rozo Wallet (Stellar USDC) - REPLACES other payment methods
                    <div className="space-y-2">
                      {/* Balance Display */}
                      {rozoWalletBalance && (
                        <p className="text-xs text-muted-foreground text-center">
                          Rozo Wallet Balance: {rozoWalletBalance} USDC
                          (Stellar)
                        </p>
                      )}

                      {/* Pay with Rozo Wallet Button */}
                      <Button
                        variant="default"
                        className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
                        onClick={handlePayWithRozoWallet}
                        disabled={isRozoWalletPaymentLoading}
                        size="lg"
                      >
                        {isRozoWalletPaymentLoading ? (
                          <>
                            <Wallet className="mr-2 h-4 w-4 animate-pulse" />
                            Processing Payment...
                          </>
                        ) : (
                          <>
                            <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Pay {hasPrice
                              ? `$${service.price_usd}`
                              : "N/A"}{" "}
                            with Rozo Wallet
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Original Payment Buttons - ONLY shown when Rozo Wallet NOT available */}

                      {/* Intent SDK for non mini app */}
                      <RozoPayButton.Custom
                        resetOnSuccess
                        appId={appId}
                        intent={`Pay for ${service.name}`}
                        toAddress={toAddress}
                        toChain={baseUSDC.chainId}
                        toToken={baseUSDC.token}
                        {...(service.price_usd && {
                          toUnits: service.price_usd.toString(),
                        })}
                        metadata={metadata as any}
                        onPaymentStarted={() => {
                          setPaymentLoading(true);
                        }}
                        onPaymentCompleted={handlePaymentCompleted}
                      >
                        {({ show }) => (
                          <div className="m-auto flex w-full flex-col gap-2">
                            <Button
                              className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
                              size={"lg"}
                              onClick={() => {
                                if (!validateEmailInput()) {
                                  return;
                                }
                                show();
                              }}
                              disabled={paymentLoading}
                            >
                              {paymentLoading ? (
                                <>
                                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
                                  Processing Payment...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                                  Pay with Crypto
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </RozoPayButton.Custom>

                      {/* Pay with Points Button */}
                      {points > 0 && (
                        <div className="space-y-2">
                          <Button
                            className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
                            size={"lg"}
                            onClick={handlePayWithPoints}
                            variant="outline"
                            disabled={!hasPrice || points < priceUsd}
                          >
                            <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
                            Pay with{" "}
                            {new Intl.NumberFormat("en-US", {
                              style: "decimal",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(priceUsd * 100)}{" "}
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
                  ))}
              </>
            )}

            {/* Sold Out State */}
            {service.sold_out && (
              <div className="w-full h-11 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg border border-gray-300 dark:border-gray-600">
                <span className="font-medium">This item is sold out</span>
              </div>
            )}
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
                {service?.name}
              </span>{" "}
              using your Rozo Points.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Points to be used:
                </span>
                <span className="font-semibold text-foreground">
                  {service &&
                    new Intl.NumberFormat("en-US", {
                      style: "decimal",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(priceUsd * 100)}{" "}
                  pts
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Available Points:
                </span>
                <span className="font-medium text-muted-foreground">
                  {Number((points ?? 0) * 100).toFixed(2)} pts
                </span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Remaining Points:
                </span>
                <span className="font-semibold text-foreground">
                  {service &&
                    new Intl.NumberFormat("en-US", {
                      style: "decimal",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format((points - priceUsd) * 100)}{" "}
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
