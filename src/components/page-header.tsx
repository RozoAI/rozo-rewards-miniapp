"use client";

import { cn } from "@/lib/utils";
import { ArrowLeft, History } from "lucide-react";
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
}: {
  title: string;
  icon?: React.ReactNode;
  isBackButton?: boolean;
}) {
  const router = useRouter();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 sm:px-0",
        isBackButton && "pl-0",
      )}
    >
      <div className="flex items-center gap-2">
        {isBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0 h-8 w-8"
          >
            <ArrowLeft className="size-4" />
          </Button>
        )}
        {icon}
        <h1 className="text-lg sm:text-2xl font-bold">{title}</h1>
      </div>

      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
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
            onSelectPayment={(paymentId) => {
              setIsHistoryOpen(false);
              router.push(`/receipt?payment_id=${paymentId}`);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
