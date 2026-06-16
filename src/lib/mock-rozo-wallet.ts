/**
 * Dev-only window.rozo mock for testing /dapp routes outside the Rozo Wallet webview.
 * Activate with ?mockRozo=1. Never runs in production.
 */
export function installMockRozoWallet(): void {
  if (process.env.NODE_ENV === "production") return;
  if (typeof window === "undefined") return;
  if (new URLSearchParams(window.location.search).get("mockRozo") !== "1") return;
  if (window.rozo) return;

  const mockAddress = "GBMOCKROZOWALLETADDRESSFORLOCALTESTING1234567890";

  window.rozo = {
    isConnected: async () => ({ isConnected: true }),
    getAddress: async () => ({ address: mockAddress }),
    getBalance: async () => ({ balance: "1000000000" }), // 100.0000000 USDC
    getNetworkDetails: async () => ({
      network: "TESTNET",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    }),
    signAuthEntry: async () => ({
      hash: "mock-tx-hash",
      status: "success",
      signedAuthEntry: "mock-signed-auth-entry",
    }),
  };

  window.dispatchEvent(new Event("rozo:ready"));
}
