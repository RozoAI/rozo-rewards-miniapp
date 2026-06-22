"use client";

import { PaymentData } from "@/app/(main)/receipt/receipt-content";
import { Button } from "@/components/ui/button";
import { useRozoPointAPI } from "@/hooks/useRozoPointAPI";
import { PAYMENT_EVENTS, REWARDS_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { savePaymentReceipt } from "@/lib/payment-storage";
import { convertToUSD, getDisplayCurrency } from "@/lib/utils";
import { Restaurant } from "@/types/restaurant";
import { useAppKitAccount } from "@reown/appkit/react";
import { baseUSDC, PaymentCompletedEvent } from "@rozoai/intent-common";
import { RozoPayButton, useRozoPay, useRozoPayUI } from "@rozoai/intent-pay";
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
  const { resetPayment } = useRozoPayUI();
  const { paymentState } = useRozoPay();
  const { getPoints, spendPoints } = useRozoPointAPI();
  const { address, isConnected } = useAppKitAccount();

  const [points, setPoints] = React.useState(0);
  const [pointsLoading, setPointsLoading] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [dialogLoading, setDialogLoading] = React.useState(false);
  const [isDebouncing, setIsDebouncing] = React.useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstAmountEffectRef = useRef(true);

  // Initial reset payment on mount (discovery-only)
  useEffect(() => {
    if (!restaurant) return;

    const price =
      restaurant.price && !isNaN(Number(restaurant.price))
        ? Number(restaurant.price)
        : 0;
    const displayCurrency = restaurant.currency || "USD";
    const usdAmount = convertToUSD(price.toFixed(2), displayCurrency);

    resetPayment({
      appId: appId,
      intent: `${restaurant.name} - ${displayCurrency} ${price.toFixed(2)}`,
      toAddress:
        restaurant.payTo ?? "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
      toChain: baseUSDC.chainId,
      toToken: baseUSDC.token as `0x${string}`,
      toUnits: usdAmount,
      metadata: generateMetadata(price.toFixed(2), displayCurrency) as any,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?._id]);

  // Fetch points balance
  useEffect(() => {
    const fetchPoints = async () => {
      if (!address) return;

      setPointsLoading(true);
      const pts = await getPoints(address);
      setPoints(pts / 100);
      setPointsLoading(false);
    };
    fetchPoints();
  }, [isConnected, address, getPoints]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced resetPayment when payment amount changes (skip initial mount,
  // which is already handled by the mount effect above)
  useEffect(() => {
    if (!restaurant) return;

    if (isFirstAmountEffectRef.current) {
      isFirstAmountEffectRef.current = false;
      return;
    }

    setIsDebouncing(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const displayCurrency = getDisplayCurrency(restaurant.currency);
      const usdAmount = convertToUSD(paymentAmount, displayCurrency);

      await resetPayment({
        appId: appId,
        intent: `Pay for ${restaurant.name} - ${displayCurrency}${paymentAmount} ($${usdAmount})`,
        toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
        toChain: baseUSDC.chainId,
        toToken: baseUSDC.token as `0x${string}`,
        toUnits: usdAmount, // Use USD amount for payment processing
        metadata: generateMetadata(paymentAmount, displayCurrency) as any,
      });

      setIsDebouncing(false);
      debounceTimerRef.current = null;
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentAmount]);

  const handlePaymentCompleted = useCallback(
    (args?: PaymentCompletedEvent) => {
      console.log("[Restaurant] Payment completed:", args);

      if (!restaurant) return;

      toast.success(`Payment successful to ${restaurant.name}!`, {
        description:
          "Your payment has been processed successfully. Redirecting to receipt...",
        duration: 2000,
      });

      // Store payment data in sessionStorage for receipt page
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
        from_address: address || "",
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [restaurant, address, paymentAmount, merchantOrderId],
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

  const confirmPaymentWithPoints = async () => {
    try {
      if (!address || !restaurant || !paymentAmount) return;

      setDialogLoading(true);

      const displayCurrency = getDisplayCurrency(restaurant?.currency);
      const usdAmount = convertToUSD(paymentAmount, displayCurrency);

      capture(PAYMENT_EVENTS.PAYMENT_CONFIRMED, {
        merchant_id: restaurant._id,
        merchant_name: restaurant.name,
        payment_method: "points",
        amount_usd: usdAmount,
        order_id: merchantOrderId,
      });

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
      const response = await spendPoints(paymentData);

      if (response && response.status === "success") {
        // Store payment data in localStorage for receipt page
        const receiptData: PaymentData = {
          ...response.data,
          restaurant_name: restaurant.name,
          restaurant_address: restaurant.address_line1,
          is_using_points: true,
        };

        console.log("[Restaurant] Pay with Points - About to save receipt:", {
          merchantOrderId,
          receiptData,
        });
        savePaymentReceipt(merchantOrderId, receiptData);
        console.log(
          "[Restaurant] Pay with Points - Receipt saved, navigating to /receipt?payment_id=" +
            merchantOrderId,
        );

        capture(REWARDS_EVENTS.REWARDS_REDEEMED, {
          merchant_id: restaurant._id,
          merchant_name: restaurant.name,
          usd_value_offset: usdAmount,
          order_id: merchantOrderId,
        });
        capture(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
          merchant_id: restaurant._id,
          merchant_name: restaurant.name,
          payment_method: "points",
          amount_usd: usdAmount,
          order_id: merchantOrderId,
        });

        setShowConfirmDialog(false);
        toast.success("Points spent successfully");
        // Navigate to receipt page
        router.push(`/receipt?payment_id=${merchantOrderId}`);
      } else {
        capture(PAYMENT_EVENTS.PAYMENT_FAILED, {
          merchant_id: restaurant._id,
          merchant_name: restaurant.name,
          payment_method: "points",
          error_message: "Failed to spend points",
        });
        toast.error("Failed to spend points");
        setDialogLoading(false);
      }
    } catch {
      if (restaurant) {
        capture(PAYMENT_EVENTS.PAYMENT_FAILED, {
          merchant_id: restaurant._id,
          merchant_name: restaurant.name,
          payment_method: "points",
          error_message: "Failed to spend points",
        });
      }
      toast.error("Failed to spend points");
      setDialogLoading(false);
    }
  };

  if (!restaurant) return null;

  return (
    <>
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
                getDisplayCurrency(restaurant?.currency),
              ),
            }
          : {})}
        toToken={baseUSDC.token}
        intent={`Pay for ${restaurant.name} - ${getDisplayCurrency(
          restaurant?.currency,
        )} ${paymentAmount}`}
        onPaymentStarted={() => {
          setLoading(true);
          const usdAmount = convertToUSD(
            paymentAmount,
            getDisplayCurrency(restaurant?.currency),
          );
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
          const usdAmount = convertToUSD(
            paymentAmount,
            getDisplayCurrency(restaurant?.currency),
          );

          return (
            <Button
              variant="default"
              className="w-full h-11 sm:h-12 cursor-pointer font-semibold text-sm sm:text-base"
              onClick={() => {
                capture(PAYMENT_EVENTS.PAYMENT_METHOD_SELECTED, {
                  merchant_id: restaurant._id,
                  merchant_name: restaurant.name,
                  payment_method: "crypto",
                });
                show();
              }}
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
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              )}
              Pay ~${isNaN(parseFloat(usdAmount)) ? "0.00" : usdAmount} with
              Crypto
            </Button>
          );
        }}
      </RozoPayButton.Custom>

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
