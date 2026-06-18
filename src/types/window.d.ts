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
   * Get the USDC/EURC balance in stroops (7 decimals)
   * usdc and eurc are the current fields; balance is kept for older app versions.
   */
  getBalance(): Promise<{ usdc: string; eurc: string; balance?: string }>;

  /**
   * Get the user's active display currency
   */
  getActiveCurrency(): Promise<{ currency: "USDC" | "EURC" }>;

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
      paymentId?: string;
      fromAddress?: string;
    },
  ): Promise<{
    signedAuthEntry: string;
    hash: string;
    status: string;
    error?: string;
  }>;
}

interface RozoReadyDetail {
  provider: WindowRozoProvider;
  isConnected?: boolean;
  address?: string | null;
  usdc?: string | null;
  eurc?: string | null;
  /** @deprecated use usdc */
  balance?: string | null;
}

interface WindowEventMap {
  "rozo:ready": CustomEvent<RozoReadyDetail>;
  "rozo:state": CustomEvent<RozoReadyDetail>;
}

interface Window {
  rozo?: WindowRozoProvider;
  ethereum?: any;
}
