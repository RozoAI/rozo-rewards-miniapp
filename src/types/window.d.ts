// Type definitions for Rozo Wallet window.rozo provider
// Rejected promises use structured errors: { code, message, recoverySuggestion? } — see src/lib/rozo-errors.ts

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
  /**
   * Rejects with structured error: code (machine-readable), message (UI-safe), recoverySuggestion (optional).
   */
  signAuthEntry(
    authEntryXdr: string,
    options: {
      func: string;
      submit: boolean;
      message: string;
    },
  ): Promise<{
    signedAuthEntry: string;
    hash: string;
    status: string;
    error?: string;
  }>;
}

interface Window {
  rozo?: WindowRozoProvider;
  ethereum?: any;
}
