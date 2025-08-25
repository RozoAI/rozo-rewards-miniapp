"use client";

import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useEffect } from "react";

export function MiniKitClient({ children }: { children: React.ReactNode }) {
  const { setFrameReady, isFrameReady } = useMiniKit();
  console.log("isFrameReady", isFrameReady);
  // The setFrameReady() function is called when your mini-app is ready to be shown
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  return children;
}
