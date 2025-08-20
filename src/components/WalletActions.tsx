import { useFrame } from "@/providers/FarcasterProvider";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "./ui/button";

export function WalletActions() {
  const { isEthProviderAvailable } = useFrame();
  const { isConnected, address, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();

  if (isConnected) {
    return (
      <div className="space-y-4 border border-[#333] rounded-md p-4">
        <h2 className="text-xl font-bold text-left">sdk.wallet.ethProvider</h2>
        <div className="flex flex-row space-x-4 justify-start items-start">
          <div className="flex flex-col space-y-4 justify-start">
            <p className="text-sm text-left">
              Connected to wallet:{" "}
              <span className="bg-white font-mono text-black rounded-md p-[4px]">
                {address}
              </span>
            </p>
            <p className="text-sm text-left">
              Chain Id:{" "}
              <span className="bg-white font-mono text-black rounded-md p-[4px]">
                {chainId}
              </span>
            </p>
            <button
              type="button"
              className="bg-white text-black rounded-md p-2 text-sm"
              onClick={() => disconnect()}
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isEthProviderAvailable) {
    return (
      <Button
        size="sm"
        onClick={() => connect({ connector: miniAppConnector() })}
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="space-y-4 border border-[#333] rounded-md p-4">
      <h2 className="text-xl font-bold text-left">sdk.wallet.ethProvider</h2>
      <div className="flex flex-row space-x-4 justify-start items-start">
        <p className="text-sm text-left">Wallet connection only via Warpcast</p>
      </div>
    </div>
  );
}
