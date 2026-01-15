// Type definitions for Rozo Wallet window.rozo provider

interface WindowRozoProvider {
  /**
   * Check if the wallet is connected
   */
  isConnected(): Promise<{ isConnected: boolean }>;

  /**
   * Get the wallet address
   */
  getAddress(): Promise<{ address: string }>;

  /**
   * Get the USDC balance in stroops (7 decimals)
   */
  getBalance(): Promise<{ balance: string }>;

  /**
   * Get network details
   */
  getNetworkDetails(): Promise<{
    network: "PUBLIC" | "TESTNET";
    sorobanRpcUrl: string;
    networkPassphrase: string;
  }>;

  /**
   * Sign an auth entry and optionally submit to network
   * @param authEntryXdr - Base64 encoded auth entry XDR
   * @param options - Signing options
   * @returns Transaction result with hash and status
   */
  signAuthEntry(
    authEntryXdr: string,
    options: {
      func: string;
      submit: boolean;
      message: string;
    }
  ): Promise<{
    signedAuthEntry: string;
    hash: string;
    status: string;
  }>;
}

interface Window {
  rozo?: WindowRozoProvider;
  ethereum?: any;
}
