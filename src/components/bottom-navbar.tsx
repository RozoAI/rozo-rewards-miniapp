"use client";

import {
  HomeIcon,
  SearchIcon,
  ServerIcon,
  Sparkle,
  StoreIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function BottomNavbar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-background border-t shadow-t shadow-card flex items-center sm:max-w-xl sm:mx-auto sm:border-x">
      <div className="w-full items-center justify-around flex md:max-w-lg md:mx-auto">
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors",
            isActive("/")
              ? "text-primary dark:text-primary font-bold"
              : "text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          )}
          prefetch={false}
        >
          <StoreIcon className="h-6 w-6" />
          <span className="text-xs">Restaurants</span>
        </Link>
        <Link
          href="/ai-services"
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors",
            isActive("/ai-services")
              ? "text-primary dark:text-primary font-bold"
              : "text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          )}
          prefetch={false}
        >
          <Sparkle className="h-6 w-6" />
          <span className="text-xs">AI Services</span>
        </Link>
        <Link
          href="/mcp-services"
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors",
            isActive("/mcp-services")
              ? "text-primary dark:text-primary font-bold"
              : "text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          )}
          prefetch={false}
        >
          <ServerIcon className="h-6 w-6" />
          <span className="text-xs">MCP Services</span>
        </Link>
      </div>
    </nav>
  );
}
