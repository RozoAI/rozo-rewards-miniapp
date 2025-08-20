"use client";

import { useFrame } from "@/providers/FarcasterProvider";
import sdk from "@farcaster/frame-sdk";

export default function FarcasterFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isSDKLoaded } = useFrame();

  if (!isSDKLoaded) {
    sdk.actions.ready();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 space-y-8">
        <h1 className="text-3xl font-bold text-center">Loading...</h1>
      </div>
    );
  }

  if (!isSDKLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 space-y-8">
        <h1 className="text-3xl font-bold text-center">
          No farcaster SDK found, please use this miniapp in the farcaster app
        </h1>
      </div>
    );
  }

  return children;
}
