"use client";

import { MiniKitClient } from "@/components/minikit-client";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "wagmi/chains";

export function MiniKitContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnchainKitProvider
      // apiKey={process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: "auto",
          theme: "default",
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
          logo: process.env.NEXT_PUBLIC_ICON_URL,
        },
      }}
      miniKit={{
        enabled: true,
        autoConnect: true,
      }}
    >
      <MiniKitClient>{children}</MiniKitClient>
    </OnchainKitProvider>
  );
}
