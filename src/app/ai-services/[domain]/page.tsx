"use client";

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
  ExternalLink,
  Loader2,
  SparkleIcon,
  Tag,
  Wallet,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

type CatalogItem = {
  domain: string;
  name: string;
  category: string;
  description: string;
  logo_url?: string;
  source?: string;
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

  const [payment, setPayment] = useState<PaymentIntentProps>();
  const [service, setService] = React.useState<CatalogItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = React.useState(false);

  React.useEffect(() => {
    async function loadService() {
      try {
        const res = await fetch("/ai_commerce_catalog.json");
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data: CatalogResponse = await res.json();

        const foundService = data.find((item) => item.domain === serviceDomain);
        if (!foundService) {
          throw new Error("AI Service not found");
        }

        setService(foundService);
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

  const handlePayment = async () => {
    if (!service) return;

    setPayment({
      toAddress: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
      toChain: baseUSDC.chainId,
      toToken: baseUSDC.token,
    });
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
              Back to AI Services
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = getFirstTwoWordInitialsFromName(service.name);
  const websiteUrl = service.source || `https://${service.domain}`;

  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4">
      {/* Header */}
      <PageHeader
        title="Back to AI Services"
        icon={<SparkleIcon className="size-6" />}
        isBackButton
      />

      {/* Service Info Card */}
      <Card className="w-full gap-3">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Avatar className="size-16 sm:size-20 rounded-lg ring-1 ring-border bg-muted flex-shrink-0">
              {service.logo_url ? (
                <AvatarImage
                  src={service.logo_url}
                  alt={service.name}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback
                title={service.name}
                className="font-medium text-base sm:text-lg"
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-2">
              <h2
                className="text-xl sm:text-2xl font-bold leading-tight"
                title={service.name}
              >
                {service.name}
              </h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4 shrink-0" />
                <div className="text-sm leading-relaxed">
                  <p className="font-medium">{service.category}</p>
                  <p className="text-xs">{service.domain}</p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Service Details */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h3 className="text-sm tracking-wide text-muted-foreground">
              Service Information
            </h3>
            <div className="space-y-2">
              <p className="text-sm leading-relaxed">
                <span className="font-medium text-muted-foreground">
                  Description:
                </span>{" "}
                {service.description}
              </p>
              <p className="text-sm">
                <span className="font-medium text-muted-foreground">
                  Website:
                </span>{" "}
                {service.domain}
              </p>
              <p className="text-sm">
                <span className="font-medium text-muted-foreground">
                  Category:
                </span>{" "}
                {service.category}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={visitWebsite}
              variant="outline"
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium"
              size="lg"
            >
              <ExternalLink className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Visit Website
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
                intent={`Pay for ${service.name}`}
                onPaymentStarted={() => {
                  setLoading(true);
                }}
                onPaymentBounced={() => {
                  setLoading(false);
                }}
                onPaymentCompleted={(args: PaymentCompletedEvent) => {
                  toast.success(`Payment successful to ${service.name}!`, {
                    description:
                      "Your payment has been processed successfully. Redirecting to receipt...",
                    duration: 2000,
                  });

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
