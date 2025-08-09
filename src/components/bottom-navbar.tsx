import {
  HomeIcon,
  SearchIcon,
  ServerIcon,
  Sparkle,
  StoreIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";

export function BottomNavbar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-background border-t shadow-t shadow-card flex items-center md:max-w-xl md:mx-auto md:border-x md:rounded-t-md">
      <div className="w-full items-center justify-around flex md:max-w-lg md:mx-auto">
        <Link
          href="#"
          className="flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          prefetch={false}
        >
          <StoreIcon className="h-6 w-6" />
          <span className="text-xs">Restaurants</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          prefetch={false}
        >
          <Sparkle className="h-6 w-6" />
          <span className="text-xs">AI Services</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
          prefetch={false}
        >
          <ServerIcon className="h-6 w-6" />
          <span className="text-xs">MCP Services</span>
        </Link>
      </div>
    </nav>
  );
}
