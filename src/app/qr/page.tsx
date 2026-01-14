"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, Copy, QrCode } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function QRPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const value = searchParams.get("value") || "";
  const [copied, setCopied] = useState(false);

  const decodedValue = useMemo(() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }, [value]);

  const handleClose = () => {
    // Try multiple approaches to close the window/webview

    // 1. Try webkit message handler (iOS WKWebView)
    if (
      typeof window !== "undefined" &&
      (window as any).webkit?.messageHandlers?.close
    ) {
      (window as any).webkit.messageHandlers.close.postMessage({});
      return;
    }

    // 2. Try Android JavaScript interface
    if (typeof window !== "undefined" && (window as any).Android?.close) {
      (window as any).Android.close();
      return;
    }

    // 3. Try React Native WebView postMessage
    if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({ type: "close" })
      );
      return;
    }

    // 4. Try standard window.close() (works if opened via JS)
    window.close();

    // 5. Fallback: go back in history if window.close() didn't work
    setTimeout(() => {
      if (!window.closed) {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }
    }, 100);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decodedValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = decodedValue;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!value) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <QrCode className="size-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No QR Data</h2>
        <p className="text-muted-foreground text-center mb-6">
          No QR code data was provided
        </p>
        <Button onClick={() => handleClose()} variant="outline">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <PageHeader title="QR Code" icon={<QrCode className="size-5" />} />

      {/* Warning Banner */}
      <div className="mx-4 sm:mx-0 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Unsupported QR Code
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              This QR code format is not currently supported for payments in the
              Rozo app. Below you can view the raw data.
            </p>
          </div>
        </div>
      </div>

      {/* Raw Data */}
      <div className="mx-4 sm:mx-0 bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Raw Data
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-3"
          >
            {copied ? (
              <>
                <Check className="size-3.5 mr-1.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5 mr-1.5" />
                Copy
              </>
            )}
          </Button>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 overflow-x-auto">
          <code className="text-xs break-all whitespace-pre-wrap font-mono">
            {decodedValue}
          </code>
        </div>
      </div>

      {/* Actions */}
      <div className="mx-4 sm:mx-0 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

export default function QRPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 pb-24">
          <PageHeader title="QR Code" />
          <div className="mx-4 sm:mx-0 bg-card rounded-xl border p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-2" />
            <div className="h-6 bg-muted rounded w-2/3" />
          </div>
        </div>
      }
    >
      <QRPageContent />
    </Suspense>
  );
}
