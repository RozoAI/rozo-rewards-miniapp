"use client";

import { Button } from "@/components/ui/button";
import { PAYMENT_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { createMerchantPayment } from "@/lib/api";
import { savePaymentReceipt, type PaymentData } from "@/lib/payment-storage";
import { convertToUSD, getDisplayCurrency } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { PaymentCompletedEvent } from "@rozoai/intent-common";
import { RozoPayButton } from "@rozoai/intent-pay";
import { CreditCard, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

interface RestaurantDiscoveryPaymentProps {
  restaurant: Restaurant;
  paymentAmount: string;
  appId: string;
  merchantOrderId: string;
  toAddress: string;
  generateMetadata: (amountLocal: string, currencyLocal: string) => object;
  loading: boolean;
  setLoading: (value: boolean) => void;
}

export function RestaurantDiscoveryPayment({
  restaurant,
  paymentAmount,
  appId,
  merchantOrderId,
  toAddress,
  generateMetadata,
  loading,
  setLoading,
}: RestaurantDiscoveryPaymentProps) {
  const router = useRouter();
  // const { getPoints, spendPoints } = useRozoPointAPI(); // ponytail: points disabled
  const [points] = React.useState(0);
  const [pointsLoading, setPointsLoading] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [dialogLoading, setDialogLoading] = React.useState(false);

  const [paymentId, setPaymentId] = React.useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = React.useState(false);
  const [isPreparingPayment, setIsPreparingPayment] = React.useState(false);
  const showRef = useRef<(() => void) | null>(null);

  // Reset payment when amount changes
  useEffect(() => {
    setPaymentId(null);
    setIsPreparingPayment(false);
    showRef.current = null;
  }, [paymentAmount]);

  // Auto-open modal once paymentId is set and show function available
  useEffect(() => {
    if (paymentId && showRef.current) {
      setIsPreparingPayment(true);
      const timer = setTimeout(() => {
        showRef.current?.();
        setIsPreparingPayment(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [paymentId]);

  const handleCreatePayment = useCallback(async () => {
    if (!restaurant || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    setIsCreatingPayment(true);
    capture(PAYMENT_EVENTS.PAYMENT_METHOD_SELECTED, {
      merchant_id: restaurant._id,
      merchant_name: restaurant.name,
      payment_method: "crypto",
    });

    try {
      const displayCurrency = getDisplayCurrency(restaurant.currency);
      const response = await createMerchantPayment({
        appId: `pos_${restaurant.handle}`,
        amount_local: paymentAmount,
        currency_local: displayCurrency,
        source: { chainId: "8453", tokenSymbol: "USDC" },
      });
      setPaymentId(response.id);
    } catch (error) {
      console.error("[Restaurant] Failed to create payment:", error);
      toast.error("Failed to create payment. Please try again.");
    } finally {
      setIsCreatingPayment(false);
    }
  }, [restaurant, paymentAmount]);

  const handlePaymentCompleted = useCallback(
    (args?: PaymentCompletedEvent) => {
      console.log("[Restaurant] Payment completed:", args);

      if (!restaurant) return;

      toast.success(`Payment successful to ${restaurant.name}!`, {
        description:
          "Your payment has been processed successfully. Redirecting to receipt...",
        duration: 2000,
      });

      const displayCurrency = getDisplayCurrency(restaurant?.currency);
      const usdAmount = convertToUSD(paymentAmount, displayCurrency);

      capture(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
        merchant_id: restaurant._id,
        merchant_name: restaurant.name,
        payment_method: "crypto",
        amount_usd: usdAmount,
        order_id: merchantOrderId,
      });

      const receiptData: PaymentData = {
        // from_address: address || "",
        from_address: "",
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

      console.log("[Restaurant] Pay with Crypto - About to save receipt:", {
        merchantOrderId,
        receiptData,
      });
      savePaymentReceipt(merchantOrderId, receiptData);
      console.log(
        "[Restaurant] Pay with Crypto - Receipt saved, navigating to /receipt?payment_id=" +
          merchantOrderId,
      );

      setTimeout(() => {
        setLoading(false);
        router.push(`/receipt?payment_id=${merchantOrderId}`);
      }, 1000);
    },
    [restaurant, paymentAmount, merchantOrderId],
  );

  const handlePayWithPoints = () => {
    if (restaurant) {
      capture(PAYMENT_EVENTS.PAYMENT_METHOD_SELECTED, {
        merchant_id: restaurant._id,
        merchant_name: restaurant.name,
        payment_method: "points",
      });
    }
    setShowConfirmDialog(true);
  };

  // const confirmPaymentWithPoints = async () => {
  //   try {
  //     if (!address || !restaurant || !paymentAmount) return;

  //     setDialogLoading(true);

  //     const displayCurrency = getDisplayCurrency(restaurant?.currency);
  //     const usdAmount = convertToUSD(paymentAmount, displayCurrency);

  //     capture(PAYMENT_EVENTS.PAYMENT_CONFIRMED, {
  //       merchant_id: restaurant._id,
  //       merchant_name: restaurant.name,
  //       payment_method: "points",
  //       amount_usd: usdAmount,
  //       order_id: merchantOrderId,
  //     });

  //     const paymentData = {
  //       from_address: address,
  //       to_handle:
  //         restaurant.handle ||
  //         restaurant.name.toLowerCase().replace(/\s+/g, ""),
  //       amount_usd_cents: parseFloat(usdAmount) * 100,
  //       amount_local: parseFloat(paymentAmount),
  //       currency_local: displayCurrency,
  //       timestamp: Date.now(),
  //       order_id: merchantOrderId,
  //       about: `Pay for ${restaurant.name} - $${paymentAmount}`,
  //     };
  //     const response = await spendPoints(paymentData);

  //     if (response && response.status === "success") {
  //       const receiptData: PaymentData = {
  //         ...response.data,
  //         restaurant_name: restaurant.name,
  //         restaurant_address: restaurant.address_line1,
  //         is_using_points: true,
  //       };

  //       console.log("[Restaurant] Pay with Points - About to save receipt:", {
  //         merchantOrderId,
  //         receiptData,
  //       });
  //       savePaymentReceipt(merchantOrderId, receiptData);
  //       console.log(
  //         "[Restaurant] Pay with Points - Receipt saved, navigating to /receipt?payment_id=" +
  //           merchantOrderId,
  //       );

  //       capture(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
  //         merchant_id: restaurant._id,
  //         merchant_name: restaurant.name,
  //         payment_method: "points",
  //         amount_usd: usdAmount,
  //         order_id: merchantOrderId,
  //       });

  //       setShowConfirmDialog(false);
  //       toast.success("Points spent successfully");
  //       router.push(`/receipt?payment_id=${merchantOrderId}`);
  //     } else {
  //       capture(PAYMENT_EVENTS.PAYMENT_FAILED, {
  //         merchant_id: restaurant._id,
  //         merchant_name: restaurant.name,
  //         payment_method: "points",
  //         error_message: "Failed to spend points",
  //       });
  //       toast.error("Failed to spend points");
  //       setDialogLoading(false);
  //     }
  //   } catch {
  //     if (restaurant) {
  //       capture(PAYMENT_EVENTS.PAYMENT_FAILED, {
  //         merchant_id: restaurant._id,
  //         merchant_name: restaurant.name,
  //         payment_method: "points",
  //         error_message: "Failed to spend points",
  //       });
  //     }
  //     toast.error("Failed to spend points");
  //     setDialogLoading(false);
  //   }
  // };

  if (!restaurant) return null;

  const displayCurrency = getDisplayCurrency(restaurant?.currency);
  const usdAmount = convertToUSD(paymentAmount, displayCurrency);
  const isAmountValid =
    paymentAmount &&
    parseFloat(paymentAmount) > 0 &&
    !isNaN(parseFloat(paymentAmount));

  return (
    <>
      {paymentId ? (
        <RozoPayButton.Custom
          key={paymentId}
          resetOnSuccess
          payId={paymentId}
          onPaymentStarted={() => {
            setLoading(true);
            capture(PAYMENT_EVENTS.PAYMENT_CONFIRMED, {
              merchant_id: restaurant._id,
              merchant_name: restaurant.name,
              payment_method: "crypto",
              amount_usd: usdAmount,
              order_id: merchantOrderId,
            });
          }}
          onPaymentCompleted={handlePaymentCompleted}
        >
          {({ show }) => {
            showRef.current = show;
            return (
              <Button
                variant="default"
                className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
                onClick={show}
                disabled={loading || isPreparingPayment}
                size="lg"
              >
                {loading || isPreparingPayment ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {isPreparingPayment
                  ? "Preparing Payment..."
                  : `Pay $${isNaN(parseFloat(usdAmount)) ? "0.00" : usdAmount} with Crypto`}
              </Button>
            );
          }}
        </RozoPayButton.Custom>
      ) : (
        <Button
          variant="default"
          className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
          onClick={handleCreatePayment}
          disabled={isCreatingPayment || loading || !isAmountValid}
          size="lg"
        >
          {isCreatingPayment ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          )}
          {isCreatingPayment
            ? "Creating Payment..."
            : `Pay $${isNaN(parseFloat(usdAmount)) ? "0.00" : usdAmount} with Crypto`}
        </Button>
      )}

      {/* Pay with Points Button */}
      {/* {points > 0 && (
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
                    getDisplayCurrency(restaurant?.currency),
                  ),
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
                    getDisplayCurrency(restaurant?.currency),
                  ),
                ),
              )
                ? 0
                : parseFloat(
                    convertToUSD(
                      paymentAmount || "0",
                      getDisplayCurrency(restaurant?.currency),
                    ),
                  ) * 100,
            )}{" "}
            Points
          </Button>
          <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            Available Points: {Number((points ?? 0) * 100).toFixed(2)} pts
            <CustomTooltip
              content="Explore all the benefits of Rozo. Rozo points are the rewards for your purchases."
              position="top"
              className="w-48 sm:w-[20rem] ml-1.5"
            >
              <HelpCircle className="ml-3 size-3 cursor-help text-muted-foreground hover:text-foreground transition-colors" />
            </CustomTooltip>
          </div>
        </div>
      )} */}

      {/* Pay with Points Confirmation Dialog */}
      {/* <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
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
                        getDisplayCurrency(restaurant?.currency),
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
                          getDisplayCurrency(restaurant?.currency),
                        ),
                      ) * 100,
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
                            getDisplayCurrency(restaurant?.currency),
                          ),
                        )) *
                        100,
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
                  <Wallet className="size-4 animate-pulse mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Coins className="size-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </>
  );
}
