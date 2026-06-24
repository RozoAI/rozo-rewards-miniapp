"use client";

import { getDefaultConfig } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider } from "wagmi";

const queryClient = new QueryClient();
export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Rozo Rewards",
    // ponytail: "eoaOnly" prevents Coinbase Wallet from opening its keys.coinbase.com popup
    // on wagmi's auto-reconnect at page load when a wallet was previously connected.
    coinbaseWalletPreference: "eoaOnly",
  }),
);

export default function Web3Provider({
  children,
  cookies,
}: {
  children: React.ReactNode;
  cookies: string | null;
}) {
  // const initialState = cookieToInitialState(
  //   wagmiAdapter.wagmiConfig as Config,
  //   cookies,
  // );

  // const [appKitInstance] = useState(() =>
  //   typeof window !== "undefined" ? initializeAppKit() : null,
  // );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
