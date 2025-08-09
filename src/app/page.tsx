import { RestaurantListView } from "@/components/restaurant-list-view";
import {
  ConnectWallet,
  Wallet,
  WalletAdvancedAddressDetails,
  WalletAdvancedWalletActions,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";

export default function Page() {
  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4">
      <div className="flex items-center justify-between px-4 sm:px-0">
        <h1 className=" text-2xl font-bold">Restaurants</h1>
        <div className="flex items-center space-x-2">
          <Wallet>
            <ConnectWallet />
            <WalletDropdown>
              <WalletAdvancedWalletActions />
              <WalletAdvancedAddressDetails />
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </div>
      <RestaurantListView />
    </div>
  );
}
