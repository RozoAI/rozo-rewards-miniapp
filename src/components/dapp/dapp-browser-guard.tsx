"use client";

import { useRozoWallet } from "@/hooks/useRozoWallet";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Guards the (dapp-merchants) route group, which is designed for the Rozo
 * wallet's in-app WebView (isDapp=true → tap a merchant opens the dapp payment
 * detail, which needs window.rozo). A regular browser has no window.rozo, so
 * those pages render no Pay button and dead-end the user.
 *
 * When the wallet check resolves and NO wallet is present (regular browser),
 * redirect to /discovery — the same merchant list in discovery mode, whose
 * detail pages (/ns/[handle]) DO show a Pay button.
 *
 * useRozoWallet already handles the async injection race (waits up to 3s for the
 * `rozo:ready` event before concluding "no wallet"), so we only decide once
 * isChecking is false. While checking, show a spinner instead of a blank page.
 */
export function DappBrowserGuard({ children }: { children: React.ReactNode }) {
  const { isAvailable, isChecking } = useRozoWallet();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isChecking) return;
    if (!isAvailable) {
      // Regular browser — send to the discovery experience (has Pay buttons).
      // Preserve any query string (e.g. filters) on the redirect.
      const qs =
        typeof window !== "undefined" ? window.location.search : "";
      router.replace(`/discovery${qs}`);
    }
  }, [isChecking, isAvailable, pathname, router]);

  // Still checking, or redirecting away — don't flash dapp UI to a browser user.
  if (isChecking || !isAvailable) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
