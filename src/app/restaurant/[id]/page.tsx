"use client";

import { GoogleMap } from "@/components/home/google-map";
import { Restaurant } from "@/components/home/home-page";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { baseUSDC, PaymentCompletedEvent } from "@rozoai/intent-common";
import { RozoPayButton } from "@rozoai/intent-pay";

import {
  ArrowLeft,
  CreditCard,
  Loader2,
  MapPin,
  StoreIcon,
  Wallet,
} from "lucide-react";
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
  logo_url: string;
  cashback_rate: number;
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
  const [restaurant, setRestaurant] = React.useState<Restaurant | null>(null);
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
          throw new Error("Lifestyle not found");
        }

        setRestaurant(foundRestaurant as Restaurant);
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
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold">Lifestyle Details</h1>
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
      <PageHeader
        title="Back to Lifestyle"
        icon={<StoreIcon className="size-6" />}
        isBackButton
      />

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
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="text-sm leading-relaxed">
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
          {/* Map View */}
          <div className="h-64 w-full rounded-lg overflow-hidden border">
            <GoogleMap
              defaultCenter={{ lat: restaurant.lat, lng: restaurant.lon }}
              restaurants={[restaurant]}
              mapProps={{
                defaultZoom: 15,
                disableDefaultUI: true,
                zoomControl: true,
                mapTypeControl: false,
                scaleControl: false,
                streetViewControl: false,
                rotateControl: false,
                fullscreenControl: false,
                draggable: false,
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={openMaps}
              variant="outline"
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium"
              size="lg"
            >
              <MapPin className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Open in Maps
            </Button>

            {!payment && (
              <Button
                onClick={handlePayment}
                disabled={paymentLoading}
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
                size="lg"
                variant="default"
              >
                {paymentLoading ? (
                  <>
                    <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
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
                intent={`Pay for ${restaurant.name}`}
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
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                    Pay with Crypto
                  </Button>
                )}
              </RozoPayButton.Custom>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
