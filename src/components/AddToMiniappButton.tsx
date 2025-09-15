"use client";

import { Button } from "@/components/ui/button";
import { useMiniappStatus } from "@/hooks/useMiniappStatus";
import { cn } from "@/lib/utils";
import { sdk } from "@farcaster/miniapp-sdk";
import { Plus } from "lucide-react";
import { forwardRef, useState } from "react";

export interface AddToMiniappButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "onClick" | "onError"> {
  /**
   * Callback function executed when the miniapp is successfully added
   */
  onAddToMiniapp?: () => void | Promise<void>;

  /**
   * Callback function executed when adding to miniapp fails
   */
  onError?: (error: Error) => void;

  /**
   * Custom text for the button
   * @default "Add to Miniapp"
   */
  children?: React.ReactNode;

  /**
   * Whether to show an icon
   * @default true
   */
  showIcon?: boolean;

  /**
   * Custom icon to display
   * @default Plus icon from lucide-react
   */
  icon?: React.ReactNode;

  /**
   * Whether to hide the button when not available
   * @default false - shows disabled button when not available
   */
  hideWhenNotAvailable?: boolean;

  /**
   * Custom disabled message when not available
   * @default "Available in Miniapp only"
   */
  disabledMessage?: string;
}

/**
 * A reusable button component that adds the current miniapp to the user's app list.
 * Uses the Farcaster SDK to prompt the user to add the miniapp.
 * Only shows when in miniapp context and user hasn't already added it.
 */
export const AddToMiniappButton = forwardRef<
  React.ElementRef<typeof Button>,
  AddToMiniappButtonProps
>(
  (
    {
      onAddToMiniapp,
      onError,
      children = "Add to Miniapp",
      showIcon = true,
      icon,
      hideWhenNotAvailable = false,
      disabledMessage = "Available in Miniapp only",
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const {
      isInMiniApp,
      hasAddedMiniapp,
      isLoading,
      markAsAdded,
      shouldShowAddButton,
    } = useMiniappStatus();
    const [isAdding, setIsAdding] = useState(false);

    // Hide button when not available if specified
    if (!shouldShowAddButton && hideWhenNotAvailable) {
      return null;
    }

    // Don't render if already added (unless hideWhenNotAvailable is false)
    if (hasAddedMiniapp && !hideWhenNotAvailable) {
      return null;
    }

    const isDisabled =
      disabled || !shouldShowAddButton || isAdding || isLoading;
    const displayIcon = icon || <Plus className="size-4" />;

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (!shouldShowAddButton || isAdding) return;

      setIsAdding(true);

      try {
        // Use Farcaster SDK to add the miniapp
        await sdk.actions.addMiniApp();

        // Mark as added in localStorage
        markAsAdded();

        // Call success callback
        if (onAddToMiniapp) {
          await onAddToMiniapp();
        }
      } catch (error) {
        console.error("Error adding to miniapp:", error);

        // Handle RejectedByUser error specifically - don't treat as failure
        if (error instanceof Error && error.name === "RejectedByUser") {
          console.log("User rejected adding to miniapp");
          // Don't call onError for user rejection, just reset state
          return;
        }

        const errorMessage =
          error instanceof Error ? error : new Error("Failed to add miniapp");

        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setIsAdding(false);
      }
    };

    const getButtonText = () => {
      if (isLoading) return "Loading...";
      if (isAdding) return "Adding...";
      if (hasAddedMiniapp) return "Added to Miniapp";
      return children;
    };

    const getTooltipMessage = () => {
      if (hasAddedMiniapp) return "Already added to your miniapp collection";
      if (!isInMiniApp) return disabledMessage;
      return undefined;
    };

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          "gap-2 transition-all duration-200",
          (!shouldShowAddButton || hasAddedMiniapp) &&
            "cursor-not-allowed opacity-60",
          className
        )}
        title={getTooltipMessage()}
        aria-label={getTooltipMessage()}
        {...props}
      >
        {showIcon && displayIcon}
        {getButtonText()}
      </Button>
    );
  }
);

AddToMiniappButton.displayName = "AddToMiniappButton";
