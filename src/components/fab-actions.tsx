"use client";

import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

/**
 * Floating Action Button with theme switcher and support actions
 */
export function FabActions({ className }: { className?: string }) {
  // const { resolvedTheme, setTheme } = useTheme();
  // const [mounted, setMounted] = useState(false);
  // const { setThemeMode } = useAppKitTheme();

  // Only show theme-dependent content after mounting to avoid hydration mismatch
  // useEffect(() => {
  //   setMounted(true);
  // }, []);

  // useEffect(() => {
  //   setThemeMode(resolvedTheme === "dark" ? "dark" : "light");
  // }, [resolvedTheme]);

  // Action button styles
  const actionButtonStyle = {
    base: "flex h-9 items-center justify-center p-2 transition-colors w-9 cursor-pointer",
    hover: "hover:bg-accent",
  };

  return (
    <div className={cn("fixed right-4 bottom-20 z-50", className)}>
      <div className="flex flex-row overflow-hidden rounded-md border bg-background shadow-xs dark:border-input">
        {/* <button
          type="button"
          className={`${actionButtonStyle.base} ${actionButtonStyle.hover}`}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted && resolvedTheme === "dark" ? (
            <MoonIcon className="size-4" />
          ) : (
            <SunIcon className="size-4" />
          )}
        </button>

        <div className="border-l dark:border-input" /> */}

        <button
          type="button"
          className={`${actionButtonStyle.base} ${actionButtonStyle.hover}`}
          onClick={() =>
            window.Intercom(
              "showNewMessage",
              "Hi, I need help with my payment.",
            )
          }
        >
          <MessageCircle className="size-4" />
        </button>
      </div>
    </div>
  );
}
