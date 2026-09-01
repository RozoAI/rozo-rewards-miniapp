"use client";

import { cn } from "@/lib/utils";
import { ArrowLeft, History, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaymentHistoryList } from "./payment-history-list";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export function PageHeader({
  title,
  icon,
  isBackButton,
  isHomeButton,
  paymentHistoryAddress,
  onBack,
}: {
  title: string;
  icon?: React.ReactNode;
  isBackButton?: boolean;
  /** Render a Home icon button on the left that navigates to "/". */
  isHomeButton?: boolean;
  /**
   * Optional wallet address used to scope the payment history sheet.
   * - When provided, history will only show receipts for this address.
   * - When omitted, history shows all stored receipts (web behavior).
   */
  paymentHistoryAddress?: string | null;
  /** Override the back button's action. Defaults to router.back(). */
  onBack?: () => void;
}) {
  const router = useRouter();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 sm:px-0",
        (isBackButton || isHomeButton) && "pl-0",
      )}
    >
      <div className="flex items-center gap-2">
        {isHomeButton ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="shrink-0 size-8"
            aria-label="Home"
          >
            <Home className="size-4" />
          </Button>
        ) : (
          isBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (onBack ? onBack() : router.back())}
              className="shrink-0 size-8"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )
        )}
        {icon}
        {title && (
          <h1 className="text-lg sm:text-2xl font-bold">{title}</h1>
        )}
      </div>

      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 size-8"
            aria-label="Payment history"
          >
            <History className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Payment History</SheetTitle>
            <SheetDescription>
              View your recent payment receipts
            </SheetDescription>
          </SheetHeader>
          <PaymentHistoryList
            address={paymentHistoryAddress}
            isOpen={isHistoryOpen}
            onSelectPayment={(paymentId) => {
              setIsHistoryOpen(false);
              router.push(
                `/receipt?payment_id=${paymentId}&withRozoWallet=true`,
              );
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
