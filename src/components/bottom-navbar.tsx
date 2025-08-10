"use client";

import { cn } from "@/lib/utils";
import { ServerIcon, Sparkle, StoreIcon, MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNavbar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t shadow-t shadow-card flex items-center max-w-xl mx-auto border-x">
      <div className="w-full items-center justify-around flex md:max-w-lg md:mx-auto">
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors min-w-0",
            isActive("/")
              ? "text-primary dark:text-primary font-bold"
              : "text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          )}
          prefetch={false}
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
          prefetch={false}
        >
          <Sparkle className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-xs font-medium">Discovery</span>
        </Link>
        <Link
          href="/map"
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors min-w-0",
            isActive("/map")
              ? "text-primary dark:text-primary font-bold"
              : "text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          )}
          prefetch={false}
        >
          <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-xs font-medium">Map</span>
        </Link>
        <Link
          href="/profile"
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors min-w-0",
            isActive("/profile")
              ? "text-primary dark:text-primary font-bold"
              : "text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          )}
          prefetch={false}
        >
          <ServerIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
