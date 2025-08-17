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
  Tag,
  Wallet,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";
import { CreditPaymentButton } from "@/components/CreditPaymentButton";
import { useCredit } from "@/contexts/CreditContext";

type CatalogItem = {
  domain: string;
  name: string;
  category: string;
  description: string;
  logo_url?: string;
  source?: string;
  cashback_rate?: number;
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
  const [showCreditPayment, setShowCreditPayment] = React.useState(false);
  const { availableCredit } = useCredit();

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
              Back to Discovery
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
      <PageHeader title="Back to Discovery" isBackButton />

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
              {service.cashback_rate && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                    🎉 {service.cashback_rate}% Cashback
                  </span>
                </div>
              )}
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
              {service.cashback_rate && (
                <p className="text-sm">
                  <span className="font-medium text-muted-foreground">
                    Cashback Rate:
                  </span>{" "}
                  <span className="font-medium text-green-600">
                    {service.cashback_rate}%
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Credit Payment Section */}
          {showCreditPayment && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-purple-800">💳 Pay with Credit</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreditPayment(false)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <CreditPaymentButton
                    merchantName={service.name}
                    merchantAddress="0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897"
                    amount={1.0} // $1 demo payment for AI service
                    cashbackRate={service.cashback_rate || 5} // Use service cashback rate or default to 5%
                    onPaymentSuccess={(data) => {
                      toast.success(`🎉 Payment successful to ${service.name}!`, {
                        description: `Earned ${data.cashback_earned} ROZO tokens`,
                        duration: 5000,
                      });
                      setShowCreditPayment(false);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-sm text-gray-600">
              Contact us:
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/rozoai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M10.488 14.651L15.25 21h7l-7.858-10.478L20.93 3h-2.65l-5.117 5.886L8.75 3h-7l7.51 10.015L2.32 21h2.65zM16.25 19L5.75 5h2l10.5 14z"></path></svg>
              </a>
              <a
                href="https://discord.com/invite/EfWejgTbuU"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.019 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                </svg>
              </a>
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

            {/* {availableCredit > 0 && !showCreditPayment && service.domain === "rozo.ai" && (
              <Button
                onClick={() => setShowCreditPayment(true)}
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Pay $1.00 with Credit ({availableCredit.toFixed(2)} available)
              </Button>
            )} */}

            {!payment && service.domain === "rozo.ai" && (
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
