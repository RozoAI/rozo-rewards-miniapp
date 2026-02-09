"use client";

import {
  getAllPaymentIds,
  getPaymentReceipt,
  PaymentData,
} from "@/lib/payment-storage";
import { getDisplayCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ChevronRight, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";

interface PaymentHistoryListProps {
  onSelectPayment: (paymentId: string) => void;
}

export function PaymentHistoryList({
  onSelectPayment,
}: PaymentHistoryListProps) {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("[PaymentHistory] Loading payment history...");
    const loadPayments = () => {
      try {
        const paymentIds = getAllPaymentIds();
        console.log("[PaymentHistory] Found payment IDs:", paymentIds);

        const paymentsData = paymentIds
          .map((id) => getPaymentReceipt(id))
          .filter((payment): payment is PaymentData => payment !== null)
          .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

        console.log("[PaymentHistory] Loaded payments:", paymentsData);
        setPayments(paymentsData);
        setIsLoading(false);
      } catch (error) {
        console.error("[PaymentHistory] Error loading payments:", error);
        setIsLoading(false);
      }
    };

    loadPayments();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Receipt className="size-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground font-medium">No payment history</p>
        <p className="text-muted-foreground/70 mt-1">
          Your completed payments will appear here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-96px)] mt-4">
      <div className="space-y-2 px-3">
        {payments.map((payment) => {
          const displayName =
            payment.restaurant_name ||
            payment.service_name ||
            payment.to_handle;
          const displayLocation =
            payment.restaurant_address || payment.service_domain;

          return (
            <Card
              key={payment.order_id}
              className="cursor-pointer hover:bg-muted/60 transition-colors p-0"
              onClick={() => onSelectPayment(payment.order_id)}
            >
              <CardContent className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {displayName}
                        </p>
                        {displayLocation && (
                          <p className="text-muted-foreground truncate">
                            {displayLocation}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {getDisplayCurrency(payment.currency_local)}{" "}
                          {payment.amount_local.toFixed(2)}
                        </p>
                        <p className="text-muted-foreground">
                          ${(payment.amount_usd_cents / 100).toFixed(2)}{" "}
                          {!payment.is_using_points && "USD"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{format(payment.timestamp, "MMM d")}</span>
                        <span>•</span>
                        <span>{format(payment.timestamp, "h:mm a")}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {payment.is_using_points && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                            Points
                          </span>
                        )}
                        <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
