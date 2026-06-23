"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPaymentReceipt, type PaymentData } from "@/lib/payment-storage";
import { getDisplayCurrency } from "@/lib/utils";
import { ArrowLeftIcon, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// ponytail: Intl instead of date-fns, saves ~75KB
const fmt = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function readPaymentData(
  searchParams: ReturnType<typeof useSearchParams>,
): PaymentData | null {
  const paymentId = searchParams.get("payment_id");
  if (paymentId) {
    const data = getPaymentReceipt(paymentId);
    if (data) return data;
  }
  try {
    const stored = sessionStorage.getItem("payment_receipt");
    if (stored) return JSON.parse(stored);
  } catch {}
  try {
    const param = searchParams.get("data");
    if (param) return JSON.parse(decodeURIComponent(param));
  } catch {}
  return null;
}

export { type PaymentData };

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-3 border-t border-border first:border-t-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function ReceiptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withRozoWallet = Boolean(searchParams.get("withRozoWallet"));

  // ponytail: lazy init — sync read, no effect, no loading state, no 300ms delay
  const [paymentData] = useState(() => readPaymentData(searchParams));

  if (!paymentData) {
    router.replace(withRozoWallet ? "/dapp" : "/");
    return null;
  }

  const handleBackToHome = () => {
    router.push(withRozoWallet ? "/dapp" : "/");
  };

  const merchant =
    paymentData.service_name ||
    paymentData.restaurant_name ||
    paymentData.to_handle;

  const currency = getDisplayCurrency(paymentData.currency_local);
  const isNonUsd = currency !== "USD";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center p-4 border-b border-border">
        <h1 className="text-base font-semibold tracking-tight">
          Payment confirmed
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6 max-w-sm mx-auto w-full">
        {/* Success icon — DS success token, no raw Tailwind green */}
        <div className="size-20 rounded-full bg-success/8 flex items-center justify-center">
          <div className="size-12 rounded-full bg-success/12 flex items-center justify-center">
            <Check className="size-6 text-success" strokeWidth={2.5} />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1">
          <h2
            className="text-2xl font-semibold tracking-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Payment confirmed
          </h2>
          <p className="text-sm text-muted-foreground">
            Paid{" "}
            <span className="font-medium text-foreground font-mono">
              {currency} {paymentData.amount_local.toFixed(2)}
            </span>{" "}
            to <span className="font-medium text-foreground">{merchant}</span>
          </p>
        </div>

        {/* Payment details — DS card tokens, no green wash */}
        <Card className="w-full bg-card border-border">
          <CardContent className="px-4 py-0">
            {isNonUsd && (
              <DetailRow
                label={`Amount (${currency})`}
                value={`${currency} ${paymentData.amount_local.toFixed(2)}`}
                mono
              />
            )}
            <DetailRow
              label={isNonUsd ? "USD equivalent" : "Amount"}
              value={`$ ${(paymentData.amount_usd_cents / 100).toFixed(2)}`}
              mono
            />
            {paymentData.is_using_points && (
              <DetailRow
                label="Points used"
                value={`${paymentData.amount_usd_cents} pts`}
                mono
              />
            )}
            <DetailRow label="Merchant" value={merchant} />
            <DetailRow
              label="Date"
              value={fmt.format(new Date(paymentData.timestamp))}
            />
            <DetailRow label="Order ID" value={paymentData.order_id} mono />
          </CardContent>
        </Card>

        <Button
          variant="outline"
          onClick={handleBackToHome}
          className="w-full"
          size="lg"
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
