"use client";

import { CreditPaymentButton } from "@/components/CreditPaymentButton";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCredit } from "@/contexts/CreditContext";
import { useRozoPoints } from "@/hooks/useRozoPoints";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { baseUSDC } from "@rozoai/intent-common";
import { ArrowLeft, Clock, CreditCard, ExternalLink, Tag } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";
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
  const {
    points,
    purchaseWithUSDC,
    approveUSDCSpending,
    redeemUsingPoints,
    isConnected: walletConnected,
    isOnBaseChain,
    usdcAllowance,
  } = useRozoPoints();
  const { usdcBalance } = useUSDCBalance();

  React.useEffect(() => {
    async function loadService() {
      try {
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
  // const amountInUnits = service.price_in_usd ? 1000000 * service.price_in_usd : 0;
  const amountInUSD = service.price_in_usd ? service.price_in_usd : 0;
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
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1">
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
                  {service.discount_rate > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-xs font-semibold bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-500/20"
                    >
                      {service.discount_rate}% OFF
                    </Badge>
                  )}

                  {/* {service.cashback_rate > 0 && (
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

          {/* Credit Payment Section */}
          {showCreditPayment && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-purple-800">
                      💳 Pay with Credit
                    </h3>
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
                      toast.success(
                        `🎉 Payment successful to ${service.name}!`,
                        {
                          description: `Earned ${data.cashback_earned} ROZO tokens`,
                          duration: 5000,
                        }
                      );
                      setShowCreditPayment(false);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact & Support */}
          <div className="space-y-3">
            <h3 className="text-sm text-muted-foreground">
              Need help? Contact us:
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="https://x.com/rozoai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <svg
                  className="size-4"
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M10.488 14.651L15.25 21h7l-7.858-10.478L20.93 3h-2.65l-5.117 5.886L8.75 3h-7l7.51 10.015L2.32 21h2.65zM16.25 19L5.75 5h2l10.5 14z"
                  ></path>
                </svg>
                <span className="font-medium">Twitter</span>
              </a>
              <a
                href="https://discord.com/invite/EfWejgTbuU"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors rounded-lg border border-indigo-200 dark:border-indigo-800"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.019 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z" />
                </svg>
                <span className="font-medium">Discord</span>
              </a>
              <a
                href="https://wa.me/14088925415?text=Hi%2C%20I'd%20like%20to%20contact%20you%20about%20your%20services."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors rounded-lg border border-green-200 dark:border-green-800"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                </svg>
                <span className="font-medium">WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Payment Options */}
            {walletConnected &&
              isOnBaseChain &&
              service &&
              service.price_in_usd && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="space-y-3">
                    {/* USDC Payment Option */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            Pay with USDC
                          </span>
                        </div>
                        <span className="text-lg font-bold text-blue-600">
                          ${service.price_in_usd}
                        </span>
                      </div>

                      <Button
                        onClick={() => {
                          const amountInWei = BigInt(
                            service.price_in_usd! * 1000000
                          );
                          const currentAllowance = usdcAllowance || BigInt(0);
                          console.log("currentAllowance", currentAllowance);
                          console.log("amountInWei", amountInWei);

                          if (currentAllowance < amountInWei) {
                            approveUSDCSpending(service.price_in_usd!);
                          } else {
                            purchaseWithUSDC(
                              service.destination || 1,
                              amountInUSD
                            );
                          }
                        }}
                        disabled={usdcBalance < service.price_in_usd!}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        size="lg"
                      >
                        {usdcBalance < service.price_in_usd! ? (
                          <>
                            <span className="text-red-200">
                              Insufficient Balance
                            </span>
                            <span className="ml-2 text-xs bg-red-500 px-2 py-1 rounded">
                              ${usdcBalance.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          (() => {
                            const amountInWei = BigInt(
                              service.price_in_usd! * 1000000
                            );
                            const currentAllowance = usdcAllowance || BigInt(0);

                            if (currentAllowance < amountInWei) {
                              return "Approve USDC First";
                            } else {
                              return `Pay $${service.price_in_usd} USDC`;
                            }
                          })()
                        )}
                      </Button>
                    </div>

                    {/* Points Payment Option */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <Tag className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            Pay with Points
                          </span>
                        </div>
                        <span className="text-lg font-bold text-blue-600">
                          {service.price_in_usd! * 100} pts
                        </span>
                      </div>

                      <Button
                        onClick={() =>
                          redeemUsingPoints(
                            service.destination || 1,
                            amountInUSD
                          )
                        }
                        disabled={points < service.price_in_usd! * 100}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        size="lg"
                      >
                        {points < service.price_in_usd! * 100 ? (
                          <>
                            <span className="text-red-200">
                              Insufficient Points
                            </span>
                            <span className="ml-2 text-xs bg-red-500 px-2 py-1 rounded">
                              {points} pts
                            </span>
                          </>
                        ) : (
                          `Redeem ${service.price_in_usd! * 100} Points`
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            {/* Visit Website Button */}
            <Button
              onClick={visitWebsite}
              variant="outline"
              className="w-full h-11 text-sm font-medium hover:bg-accent/50 transition-colors"
              size="lg"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Visit Website
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
