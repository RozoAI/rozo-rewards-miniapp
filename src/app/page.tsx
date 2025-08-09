import { RestaurantListView } from "@/components/restaurant-list-view";
import { Button } from "@/components/ui/button";
import {
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Address,
  Avatar,
  EthBalance,
  Identity,
  Name,
} from "@coinbase/onchainkit/identity";
import { Wallet } from "@coinbase/onchainkit/wallet";

export default function Page() {
  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4">
      <div className="flex items-center justify-between">
        <h1 className="ml-4 sm:ml-0 text-2xl font-bold">Restaurants</h1>
        <div className="flex items-center space-x-2">
          <Wallet className="z-10">
            <ConnectWallet>
              <Name className="text-inherit" />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="text-sm" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </div>
      <RestaurantListView />
    </div>
  );
}
