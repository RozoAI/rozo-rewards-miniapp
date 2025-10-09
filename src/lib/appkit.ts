import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  base as baseNetwork,
  bsc as bscNetwork,
  polygon as polygonNetwork,
} from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { http } from "viem";
import { base, bsc, mainnet, polygon } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// WalletConnect v2 Project ID - you should get your own from https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "ab8fa47f01e6a72c58bbb76577656051";

// 2. Create a metadata object - optional
const metadata = {
  name: "Banana DApp",
  description: "Banana DApp - Generate and manage your digital bananas",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://b.rozo.ai",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

// 3. Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks: [baseNetwork, polygonNetwork, bscNetwork],
  projectId: WALLETCONNECT_PROJECT_ID,
  ssr: true,
  chains: [mainnet, base, polygon, bsc],
  transports: {
    [base.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
  },
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
});

// 4. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks: [baseNetwork, polygonNetwork, bscNetwork],
  projectId: WALLETCONNECT_PROJECT_ID,
  metadata,
  features: {
    email: false, // default to true
    socials: ["farcaster"],
    emailShowWallets: true, // default to true
  },
  allWallets: "SHOW", // default to SHOW
  coinbasePreference: "all",
  enableCoinbase: true,
  themeMode: "light",
});
