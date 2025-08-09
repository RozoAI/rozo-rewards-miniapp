"use client";

import { MiniKitClient } from "@/components/minikit-client";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { base } from "wagmi/chains";

export function MiniKitContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MiniKitProvider
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
    >
      <MiniKitClient>{children}</MiniKitClient>
    </MiniKitProvider>
  );
}
