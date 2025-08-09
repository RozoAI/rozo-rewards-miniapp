"use client";

import { HelpCircleIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Floating Action Button with theme switcher and support actions
 */
export function FabActions() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only show theme-dependent content after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Action button styles
  const actionButtonStyle = {
    base: "flex h-9 items-center justify-center p-2 transition-colors w-9 cursor-pointer",
    hover: "hover:bg-accent",
  };

  return (
    <div className="fixed right-4 bottom-20 z-50">
      <div className="flex flex-row overflow-hidden rounded-md border bg-background shadow-xs dark:border-input">
        {/* Theme Switcher Button */}
        <button
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

        {/* Divider */}
        <div className="border-l dark:border-input" />

        {/* Support Button */}
        <button
          type="button"
          className={`${actionButtonStyle.base} ${actionButtonStyle.hover}`}
          onClick={() =>
            window.Intercom(
              "showNewMessage",
              "Hi, I need help with my payment."
            )
          }
        >
          <HelpCircleIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
