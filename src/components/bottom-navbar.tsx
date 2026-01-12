"use client";

import { useRozoWallet } from "@/hooks/useRozoWallet";
import { cn } from "@/lib/utils";
import { Binoculars, StoreIcon, User, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNavbar() {
  const pathname = usePathname();
  const {
    isAvailable: isRozoWalletAvailable,
    isConnected: isRozoWalletConnected,
  } = useRozoWallet();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  // Hide navbar on /dapp route
  if (
    pathname === "/dapp" ||
    pathname === "/wallet" ||
    (isRozoWalletAvailable && isRozoWalletConnected)
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t shadow-t shadow-card flex items-center max-w-xl mx-auto border-x">
      <div className="w-full items-center justify-around flex md:max-w-lg md:mx-auto">
        <Link
          href="/lifestyle"
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors min-w-0",
            isActive("/lifestyle")
              ? "text-primary dark:text-primary font-bold"
              : "text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          )}
        >
          <StoreIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-xs font-medium">Lifestyle</span>
        </Link>
        <Link
          href="/ai-services"
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors min-w-0",
            isActive("/ai-services")
              ? "text-primary dark:text-primary font-bold"
              : "text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          )}
        >
          <Binoculars className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-xs font-medium" suppressHydrationWarning>
            Discovery
          </span>
        </Link>
        <Link
          href="/pay"
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors min-w-0",
            isActive("/pay")
              ? "text-primary dark:text-primary font-bold"
              : "text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          )}
        >
          <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-xs font-medium">Pay</span>
        </Link>
        <Link
          href="/profile"
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors min-w-0",
            isActive("/profile")
              ? "text-primary dark:text-primary font-bold"
              : "text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          )}
        >
          <User className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
