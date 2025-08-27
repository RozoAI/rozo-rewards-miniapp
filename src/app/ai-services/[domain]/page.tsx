"use client";

import { ContactSupport } from "@/components/contact-support";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRozoPointAPI } from "@/hooks/useRozoPointAPI";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { baseUSDC, PaymentCompletedEvent } from "@rozoai/intent-common";
import { RozoPayButton, useRozoPayUI } from "@rozoai/intent-pay";
import {
  ArrowLeft,
  Clock,
  Coins,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Tag,
  Wallet,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import data from "../../../../public/ai_commerce_catalog.json";

type CatalogItem = {
  domain: string;
  name: string;
  price_in_usd: number;
  original_value_usd: number;
  duration_months: number;
  destination: number;
  category: string;
  description: string;
  offer_description: string;
  logo_url: string;
  cashback_rate: number;
  discount_rate: number;
  savings_usd: number;
  source: string;
  sold_out?: boolean;
};

type CatalogResponse = CatalogItem[];

type PaymentIntentProps = {
  toAddress: string;
  toChain: number;
  toUnits?: string;
  toToken: string;
};

export default function AIServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceDomain = params.domain as string;

  const { resetPayment } = useRozoPayUI();
  const { getPoints, spendPoints } = useRozoPointAPI();
  const { address, isConnected } = useAccount();

  const [service, setService] = React.useState<CatalogItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = React.useState(false);
  const [points, setPoints] = React.useState(0);
  const [pointsLoading, setPointsLoading] = React.useState(false);

  useEffect(() => {
    async function loadService() {
      try {
        const foundService = data.find((item) => item.domain === serviceDomain);
        if (!foundService) {
          throw new Error("AI Service not found");
        }

        setService(foundService);
        resetPayment({
          intent: `Pay for ${foundService.name} - ${foundService.duration_months} months`,
          toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
          toChain: baseUSDC.chainId,
          toToken: baseUSDC.token as `0x${string}`,
          toUnits: foundService.price_in_usd?.toString(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (serviceDomain) {
      loadService();
    }
  }, [serviceDomain]);

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

  const handlePayWithPoints = async () => {
    if (!address || !service) return;

    setPaymentLoading(true);

    const signature = await spendPoints({
      from_address: address,
      to_handle: service.domain,
      amount_usd_cents: service.price_in_usd * 100,
      amount_local: service.price_in_usd,
      currency_local: "USD",
      timestamp: Date.now(),
      order_id: Date.now().toString(),
      about: `Pay for ${service.name} - ${service.duration_months} months`,
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

  const visitWebsite = () => {
    if (service) {
      const url = service.source || `https://${service.domain}`;
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

  if (error || !service) {
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
          <h1 className="text-lg sm:text-2xl font-bold">AI Service Details</h1>
        </div>
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-destructive text-lg font-medium mb-2">
              {error || "AI Service not found"}
            </p>
            <p className="text-muted-foreground mb-4">
              The AI service you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
            <Button
              onClick={() => router.push("/ai-services")}
              variant="outline"
            >
              Back to Discovery
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = getFirstTwoWordInitialsFromName(service.name);

  return (
    <div className="w-full mb-16 flex flex-col gap-4 sm:gap-6 mt-4 px-3 sm:px-4 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader title="Back to Discovery" isBackButton />

      {/* Service Info Card */}
      <Card className="w-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm shadow-sm gap-0">
        <CardHeader>
          <div className="flex items-start gap-3 sm:gap-4">
            <Avatar className="size-16 sm:size-20 rounded-xl ring-1 ring-border/50 bg-muted/50 flex-shrink-0 shadow-sm">
              {service.logo_url ? (
                <AvatarImage
                  src={service.logo_url}
                  alt={service.name}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback
                title={service.name}
                className="font-semibold text-base sm:text-lg bg-gradient-to-br from-primary/10 to-primary/5 text-primary"
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-3 flex flex-row justify-between gap-2">
              <div className="space-y-1 flex-1">
                <h2
                  className="text-xl sm:text-2xl font-bold leading-tight"
                  title={service.name}
                >
                  {service.name}
                </h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-4 w-4 shrink-0" />
                  <div className="text-sm leading-relaxed">
                    <p className="font-medium">
                      {service.category} ({service.domain})
                    </p>
                  </div>
                </div>
              </div>

              {/* Visit Website Button */}
              <Button
                onClick={visitWebsite}
                variant="ghost"
                className="mb-auto"
                size="icon"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 pt-0">
          {/* Service Description */}
          <div className="space-y-1.5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {service.description}
            </p>
            {service.offer_description && service.original_value_usd > 0 && (
              <p className="text-xs text-muted-foreground/80 italic">
                {service.offer_description}
              </p>
            )}
          </div>

          {/* Bundle Pricing Display */}
          {service.original_value_usd > 0 && (
            <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-primary/5 rounded-xl p-4 border border-primary/20 shadow-sm">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-foreground">
                  ${service.price_in_usd}
                </span>
                <span className="text-sm font-medium text-muted-foreground line-through">
                  ${service.original_value_usd}
                </span>
                {service.duration_months > 0 && (
                  <span className="text-xs ml-auto text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg flex items-center gap-1 border border-border/50">
                    <Clock className="size-3" />
                    {service.duration_months} months
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {service.sold_out && (
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                    >
                      Sold Out
                    </Badge>
                  )}

                  {!service.sold_out && service.discount_rate > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-xs font-semibold bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-500/20"
                    >
                      {service.discount_rate}% OFF
                    </Badge>
                  )}

                  {/* {!service.sold_out && service.cashback_rate > 0 && (
                     <Badge
                       variant="secondary"
                       className="text-xs font-semibold bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20"
                     >
                       {service.cashback_rate}% Cashback
                     </Badge>
                   )} */}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Intent SDK for non mini app */}
            {!service.sold_out && (
              <RozoPayButton.Custom
                closeOnSuccess
                resetOnSuccess
                appId="rozoRewards"
                intent={`Pay for ${service.name} - ${service.duration_months} months`}
                toAddress="0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897"
                toChain={8453}
                toToken="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
                {...(service.price_in_usd && {
                  toUnits: service.price_in_usd.toString(),
                })}
                onPaymentStarted={() => {
                  setPaymentLoading(true);
                }}
                onPaymentBounced={() => {
                  setPaymentLoading(false);
                }}
                onPaymentCompleted={(args: PaymentCompletedEvent) => {
                  toast.success(`Payment successful to ${service.name}!`, {
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
                  <div className="m-auto flex w-full flex-col gap-2">
                    <Button
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
                      size={"lg"}
                      onClick={show}
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
            )}

            {/* Pay with Points Button */}
            {!service.sold_out && points > 0 ? (
              <div className="space-y-2">
                <Button
                  className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
                  size={"lg"}
                  onClick={handlePayWithPoints}
                  variant="outline"
                  disabled={paymentLoading || points < service.price_in_usd}
                >
                  {paymentLoading ? (
                    <>
                      <Wallet className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
                      Pay with{" "}
                      {new Intl.NumberFormat("en-US", {
                        style: "decimal",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(service.price_in_usd * 100)}{" "}
                      Points
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  Available Points:{" "}
                  {new Intl.NumberFormat("en-US", {
                    style: "decimal",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format((points ?? 0) * 100)}{" "}
                  pts
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Explore all the benefits of Rozo. Rozo points are the
                      rewards for your purchases.
                    </TooltipContent>
                  </Tooltip>
                </p>
              </div>
            ) : (
              !service.sold_out && (
                <p className="text-sm text-muted-foreground text-center">
                  No points available. Make a purchase to start earning rewards.
                </p>
              )
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
    </div>
  );
}
