import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  arbitrum as arbitrumNetwork,
  avalanche as avalancheNetwork,
  base as baseNetwork,
  bsc as bscNetwork,
  gnosis as gnosisNetwork,
  mainnet as mainnetNetwork,
  optimism as optimismNetwork,
  polygon as polygonNetwork,
  worldchain as worldchainNetwork,
} from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { http } from "viem";
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  gnosis,
  mainnet,
  optimism,
  polygon,
  worldchain,
} from "wagmi/chains";
import { injected } from "wagmi/connectors";

// WalletConnect v2 Project ID - you should get your own from https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "ab8fa47f01e6a72c58bbb76577656051";

// 2. Create a metadata object - optional
const metadata = {
  name: "Rozo Rewards",
  description: "Rozo Rewards - Earn rewards at your favorite restaurants",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://rewards.rozo.ai",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

// 3. Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks: [
    arbitrumNetwork,
    avalancheNetwork,
    baseNetwork,
    bscNetwork,
    gnosisNetwork,
    mainnetNetwork,
    optimismNetwork,
    polygonNetwork,
    worldchainNetwork,
  ],
  projectId: WALLETCONNECT_PROJECT_ID,
  ssr: true,
  chains: [
    arbitrum,
    avalanche,
    base,
    bsc,
    gnosis,
    mainnet,
    optimism,
    polygon,
    worldchain,
  ],
  transports: {
    [arbitrum.id]: http(),
    [avalanche.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
    [gnosis.id]: http(),
    [mainnet.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [worldchain.id]: http(),
  },
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
});

// 4. Create modal - only initialize once
let appKitInstance: any = null;

export function initializeAppKit() {
  if (!appKitInstance && typeof window !== "undefined") {
    appKitInstance = createAppKit({
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
  }
  return appKitInstance;
}

export function getAppKitInstance() {
  return appKitInstance;
}
