"use client";

import { useIsInMiniApp } from "@coinbase/onchainkit/minikit";
import { useEffect, useState } from "react";

/**
 * Hook to detect miniapp status and whether the user has already added the miniapp.
 *
 * According to Farcaster docs, there's no direct way to check if a user has already
 * added the miniapp, so we track this locally after successful additions.
 */
export function useMiniappStatus() {
  const { isInMiniApp } = useIsInMiniApp();
  const [hasAddedMiniapp, setHasAddedMiniapp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for previous addition status
    const checkAddedStatus = () => {
      try {
        const added = localStorage.getItem("miniapp-added");
        const domain = window.location.hostname;
        const addedForDomain = localStorage.getItem(`miniapp-added-${domain}`);

        setHasAddedMiniapp(added === "true" || addedForDomain === "true");
      } catch (error) {
        console.warn("Could not access localStorage:", error);
        setHasAddedMiniapp(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAddedStatus();
  }, []);

  const markAsAdded = () => {
    try {
      const domain = window.location.hostname;
      localStorage.setItem("miniapp-added", "true");
      localStorage.setItem(`miniapp-added-${domain}`, "true");
      setHasAddedMiniapp(true);
    } catch (error) {
      console.warn("Could not save to localStorage:", error);
    }
  };

  const resetAddedStatus = () => {
    try {
      const domain = window.location.hostname;
      localStorage.removeItem("miniapp-added");
      localStorage.removeItem(`miniapp-added-${domain}`);
      setHasAddedMiniapp(false);
    } catch (error) {
      console.warn("Could not clear localStorage:", error);
    }
  };

  return {
    isInMiniApp,
    hasAddedMiniapp,
    isLoading,
    markAsAdded,
    resetAddedStatus,
    // Determine if we should show the add button
    shouldShowAddButton: isInMiniApp && !hasAddedMiniapp && !isLoading,
  };
}
