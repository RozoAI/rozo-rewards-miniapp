"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import {
  ConnectWallet,
  WalletAdvancedAddressDetails,
  WalletAdvancedWalletActions,
  Wallet as WalletComponent,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { baseUSDC, PaymentCompletedEvent } from "@rozoai/intent-common";
import { RozoPayButton } from "@rozoai/intent-pay";
import { ArrowLeft, CreditCard, Loader2, MapPin, Wallet } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

type LocationItem = {
  _id: string;
  name: string;
  formatted: string;
  address_line1: string;
  address_line2?: string;
  lat: number;
  lon: number;
  createdAt?: string;
  updatedAt?: string;
};

type CoffeeMapResponse = {
  locations: LocationItem[];
  status?: string;
};

type PaymentIntentProps = {
  toAddress: string;
  toChain: number;
  toUnits?: string;
  toToken: string;
};

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id as string;

  const [payment, setPayment] = useState<PaymentIntentProps>();
  const [restaurant, setRestaurant] = React.useState<LocationItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = React.useState(false);

  React.useEffect(() => {
    async function loadRestaurant() {
      try {
        const res = await fetch("/coffee_mapdata.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data: CoffeeMapResponse = await res.json();

        const foundRestaurant = data.locations.find(
          (loc) => loc._id === restaurantId
        );
        if (!foundRestaurant) {
          throw new Error("Restaurant not found");
        }

        setRestaurant(foundRestaurant);
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

  const handlePayment = async () => {
    if (!restaurant) return;

    setPayment({
      toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
      toChain: baseUSDC.chainId,
      toToken: baseUSDC.token,
    });
  };

  const openMaps = () => {
    if (restaurant) {
      const url = `https://maps.google.com/?q=${restaurant.lat},${restaurant.lon}`;
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4 sm:px-0">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-8 h-8 bg-muted animate-pulse rounded-md" />
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </div>
        <Card className="w-full">
          <CardHeader className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="size-20 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
            <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4 sm:px-0">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Restaurant Details</h1>
        </div>
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-destructive text-lg font-medium mb-2">
              {error || "Restaurant not found"}
            </p>
            <p className="text-muted-foreground mb-4">
              The restaurant you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
            <Button onClick={() => router.push("/")} variant="outline">
              Back to Restaurants
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = getFirstTwoWordInitialsFromName(restaurant.name);

  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="size-6" />
          </Button>
          <h1 className="text-2xl font-bold">Restaurant Details</h1>
        </div>
        <div className="flex items-center space-x-2">
          <WalletComponent>
            <ConnectWallet />
            <WalletDropdown>
              <WalletAdvancedWalletActions />
              <WalletAdvancedAddressDetails />
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </WalletComponent>
        </div>
      </div>

      {/* Restaurant Info Card */}
      <Card className="w-full gap-2">
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="size-20 rounded-xl ring-1 ring-border bg-muted">
              <AvatarFallback
                title={restaurant.name}
                className="font-medium text-lg"
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold mb-2" title={restaurant.name}>
                {restaurant.name}
              </h2>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">{restaurant.address_line1}</p>
                  {restaurant.address_line2 && (
                    <p>{restaurant.address_line2}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {/* Location Details */}
          <div className="bg-muted/30 rounded-lg space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Location Information
            </h3>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Full Address:</span>{" "}
                {restaurant.formatted}
              </p>
              <p className="text-sm">
                <span className="font-medium">Coordinates:</span>{" "}
                {restaurant.lat}, {restaurant.lon}
              </p>
              {restaurant.createdAt && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Added:</span>{" "}
                  {new Date(restaurant.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            {!payment && (
              <Button
                onClick={handlePayment}
                disabled={paymentLoading}
                className="w-full h-12 text-base font-semibold"
                size="lg"
                variant="default"
              >
                {paymentLoading ? (
                  <>
                    <Wallet className="mr-2 h-5 w-5 animate-pulse" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pay with Crypto
                  </>
                )}
              </Button>
            )}

            {payment && (
              <RozoPayButton.Custom
                defaultOpen
                closeOnSuccess
                resetOnSuccess
                appId={"rozoInvoice"}
                toAddress={payment.toAddress as `0x${string}`}
                toChain={Number(payment.toChain)}
                {...(payment.toUnits && {
                  toUnits: payment.toUnits,
                })}
                toToken={payment.toToken as `0x${string}`}
                onPaymentStarted={() => {
                  setLoading(true);
                }}
                onPaymentBounced={() => {
                  setLoading(false);
                }}
                onPaymentCompleted={(args: PaymentCompletedEvent) => {
                  toast.success(`Payment successful to ${restaurant.name}!`, {
                    description:
                      "Your payment has been processed successfully.",
                    duration: 5000,
                  });
                }}
              >
                {({ show }) => (
                  <Button
                    variant="default"
                    className="w-full cursor-pointer py-6 font-semibold text-base"
                    onClick={show}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-5 w-5" />
                    )}
                    Pay with Crypto
                  </Button>
                )}
              </RozoPayButton.Custom>
            )}

            <Button
              onClick={openMaps}
              variant="outline"
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              <MapPin className="mr-2 h-5 w-5" />
              Open in Maps
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
