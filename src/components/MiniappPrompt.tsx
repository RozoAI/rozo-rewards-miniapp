"use client";

import { useMiniappStatus } from "@/hooks/useMiniappStatus";
import { X } from "lucide-react";
import { useState } from "react";
import { AddToMiniappButton } from "./AddToMiniappButton";
import { Button } from "./ui/button";

/**
 * A floating prompt that appears when user is in miniapp but hasn't added it yet.
 * Shows at the top of the screen with option to dismiss.
 */
export function MiniappPrompt() {
  const { shouldShowAddButton } = useMiniappStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if not needed or dismissed
  if (!shouldShowAddButton || isDismissed) {
    return null;
  }

  const handleSuccess = () => {
    // Automatically dismiss on success
    setIsDismissed(true);
  };

  const handleError = (error: Error) => {
    console.error("Failed to add miniapp:", error);
    // Don't dismiss for actual errors - user might want to try again
    // Could show a toast notification here
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black text-white shadow-lg border-b border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-1">
            <p className="text-sm font-medium">Add to your apps</p>
            <p className="text-xs opacity-70">Quick access to Rozo Rewards</p>
          </div>

          <AddToMiniappButton
            onAddToMiniapp={handleSuccess}
            onError={handleError}
            variant="outline"
            size="sm"
            className="bg-white text-black dark:text-white hover:bg-gray-100 border-white shrink-0"
          >
            Add
          </AddToMiniappButton>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="ml-2 h-6 w-6 text-white hover:bg-white/10 shrink-0"
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
