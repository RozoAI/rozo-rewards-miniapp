import { Suspense } from "react";
import ReceiptContent from "./receipt-content";

export default function ReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            Loading payment details...
          </div>
        </div>
      }
    >
      <ReceiptContent />
    </Suspense>
  );
}
