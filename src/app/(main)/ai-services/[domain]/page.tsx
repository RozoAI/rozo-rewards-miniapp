"use client";

import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { getAiServiceById } from "@/lib/ai-services";
import { REWARDS_EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/index";
import { getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { CreditCard, MessageCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

const AiServiceDiscoveryPayment = dynamic(
  () =>
    import("@/components/ai-services/ai-service-discovery-payment").then(
      (m) => m.AiServiceDiscoveryPayment,
    ),
  { ssr: false },
);

const APP_ID = "rozoRewardsBNBStellarMP-zen";

export default function AIServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.domain as string;
  const [service, setService] =
    React.useState<ReturnType<typeof getAiServiceById>>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = React.useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState<string>("");
  const [emailError, setEmailError] = React.useState<string>("");
  const hasAutoOpenedIntercomRef = useRef(false);

  const { toggleBookmark, isBookmarked } = useBookmarks();

  const merchantOrderId = useMemo(
    () => `${(service?.id || "service").toUpperCase()}-${Date.now()}`,
    [service?.id],
  );
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

  useEffect(() => {
    function loadService() {
      try {
        const foundService = getAiServiceById(serviceId);
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

    if (serviceId) {
      loadService();
    }
  }, [serviceId]);

  useEffect(() => {
    if (!service?.id) return;
    capture(REWARDS_EVENTS.MERCHANT_VIEWED, {
      merchant_id: service.id,
      merchant_name: service.name,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.id]);

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

  const handleShare = () => {
    const text = `Check out ${service?.name} for ${hasPrice ? `$${service?.price_usd}` : "N/A"}! ${service?.description}.`;

    if (service) {
      capture(REWARDS_EVENTS.MERCHANT_SHARE_CLICKED, {
        merchant_id: service.id,
        merchant_name: service.name,
        channel: "native_share",
      });
    }

    (async () => {
      try {
        await navigator.share({ title: text, url: window.location.href });
      } catch (err) {
        console.error(`Error sharing: ${err}`);
      }
    })();
  };

  const handleBookmark = () => {
    if (service) {
      const wasBookmarked = isBookmarked(service.id);
      toggleBookmark({
        id: service.id,
        title: service.name,
        logo_url: service.logoUrl,
        url: `/ai-services/${service.id}`,
      });
      capture(REWARDS_EVENTS.MERCHANT_BOOKMARKED, {
        merchant_id: service.id,
        merchant_name: service.name,
        action: wasBookmarked ? "remove" : "add",
      });
      toast.success(
        wasBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
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

  if (loading) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4 max-w-xl mx-auto">
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
      <div className="w-full mb-16 flex flex-col gap-4 mt-4 px-4 max-w-xl mx-auto">
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
    <div className="w-full mb-20 flex flex-col gap-4 mt-4 px-4 max-w-xl mx-auto">
      {/* Header */}
      <PageHeader title="Back to Discovery" isBackButton />

      {/* Service Info Card */}
      <Card className="w-full overflow-hidden gap-0">
        <CardHeader className="space-y-4 pb-5">
          <div className="rounded-xl border border-border bg-muted/30">
            <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border border-border bg-background aspect-video">
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
                  className="font-semibold text-2xl bg-muted text-muted-foreground"
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
            {/* <div className="mt-2 sm:mt-0 sm:ml-4 sm:self-start">
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
                  <Share className="size-4" />
                </Button>
              </div>
            </div> */}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 pt-0">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="space-y-1">
              <div className="space-y-1">
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
                    <span className="rounded-md bg-success/10 px-1.5 py-0 text-[11px] font-semibold text-success dark:bg-success/20">
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

                {!service.sold_out && (
                  <AiServiceDiscoveryPayment
                    service={service}
                    merchantOrderId={merchantOrderId}
                    userEmail={userEmail}
                    appId={APP_ID}
                    validateEmailInput={validateEmailInput}
                    paymentLoading={paymentLoading}
                    setPaymentLoading={setPaymentLoading}
                  />
                )}
              </>
            )}

            {/* Sold Out State */}
            {service.sold_out && (
              <div className="w-full h-11 flex items-center justify-center bg-muted text-muted-foreground rounded-lg border border-border">
                <span className="font-medium">This item is sold out</span>
              </div>
            )}
          </div>

          {/* Contact & Support */}
          {/* <ContactSupport /> */}
        </CardContent>
      </Card>
    </div>
  );
}
