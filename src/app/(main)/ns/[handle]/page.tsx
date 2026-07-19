"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PAYMENT_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { getRestaurantByHandle } from "@/lib/restaurants";
import { PaymentStatus, type PaymentResponse } from "@rozoai/intent-common";
import { AlertCircle, Loader2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import React, { Suspense, useEffect, useState } from "react";

const RestaurantDappDetail = dynamic(
  () => import("@/components/restaurant/restaurant-dapp-detail").then((m) => ({ default: m.RestaurantDappDetail })),
  { ssr: false },
);

const RestaurantDiscoveryDetail = dynamic(
  () => import("@/components/restaurant/restaurant-discovery-detail").then((m) => ({ default: m.RestaurantDiscoveryDetail })),
  { ssr: false },
);

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground mb-3" />
          <p className="text-foreground font-medium mb-1">{text}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RestaurantDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading..." />}>
      <RestaurantDetailContent />
    </Suspense>
  );
}

function RestaurantDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const handle = params.handle as string;
  const paymentIdParam = searchParams.get("paymentId");

  const [isRozoWallet, setIsRozoWallet] = useState(false);
  const [prefilledPayment, setPrefilledPayment] = useState<PaymentResponse | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    setIsRozoWallet(typeof window !== "undefined" && !!window.rozo);
  }, []);

  const restaurant = React.useMemo(
    () => getRestaurantByHandle(handle),
    [handle],
  );

  // Fetch payment data when paymentId is provided
  useEffect(() => {
    if (!paymentIdParam) return;

    setIsLoadingPayment(true);
    capture(PAYMENT_EVENTS.PAYMENT_LINK_OPENED, {
      payment_id: paymentIdParam,
      source: "url_param",
    });

    import("@rozoai/intent-common").then(({ getPayment }) =>
      getPayment(paymentIdParam),
    )
      .then((response) => {
        if (response.error) {
          throw new Error(response.error.message ?? "Failed to fetch payment");
        }

        const payment = response.data;
        if (!payment) {
          throw new Error("No payment data returned");
        }

        if (payment.status === PaymentStatus.PaymentUnpaid) {
          setPrefilledPayment(payment);
          capture(PAYMENT_EVENTS.PAYMENT_LINK_LOADED, {
            payment_id: paymentIdParam,
            payment_status: payment.status,
          });
        } else {
          setPaymentError(
            payment.status === PaymentStatus.PaymentCompleted
              ? "This payment has already been completed."
              : `This payment cannot be processed (status: ${payment.status}).`
          );
          capture(PAYMENT_EVENTS.PAYMENT_LINK_ERROR, {
            payment_id: paymentIdParam,
            payment_status: payment.status,
            error_message: `Payment status: ${payment.status}`,
          });
        }
      })
      .catch((err) => {
        console.error("[PaymentLink] Failed to fetch payment:", err);
        setPaymentError("Failed to load payment details. Please try again.");
        capture(PAYMENT_EVENTS.PAYMENT_LINK_ERROR, {
          payment_id: paymentIdParam,
          error_message: err instanceof Error ? err.message : "Unknown error",
        });
      })
      .finally(() => setIsLoadingPayment(false));
  }, [paymentIdParam]);

  useEffect(() => {
    if (!restaurant) {
      const timer = setTimeout(() => router.replace("/discovery"), 2500);
      return () => clearTimeout(timer);
    }
  }, [restaurant, router]);

  if (isLoadingPayment) {
    return <LoadingSpinner text="Loading payment details..." />;
  }

  if (paymentError) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="size-8 text-destructive mb-3" />
            <p className="text-foreground font-medium mb-1">Payment Issue</p>
            <p className="text-muted-foreground text-sm">{paymentError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground mb-3" />
            <p className="text-foreground font-medium mb-1">
              This merchant might be offline
            </p>
            <p className="text-muted-foreground text-sm">
              Taking you to Discovery…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isRozoWallet) {
    return (
      <RestaurantDappDetail
        restaurant={restaurant}
        onBack={() => router.push("/dapp")}
      />
    );
  }

  return (
    <RestaurantDiscoveryDetail
      restaurant={restaurant}
      onBack={() => router.push("/discovery")}
      prefilledPayment={prefilledPayment}
    />
  );
}
