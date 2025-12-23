import { useEffect, useState, useCallback } from 'react';

// Types
interface RozoProvider {
  isRozo: boolean;
  isConnected: () => Promise<{ isConnected: boolean }>;
  getAddress: () => Promise<{ address: string }>;
  getPublicKey: () => Promise<{ publicKey: string }>;
  getNetwork: () => Promise<{ network: string; networkPassphrase: string }>;
  getNetworkDetails: () => Promise<{
    network: string;
    networkUrl: string;
    networkPassphrase: string;
    sorobanRpcUrl: string;
  }>;
  signTransaction: (
    xdr: string,
    opts?: { network?: string; address?: string; submit?: boolean }
  ) => Promise<{ signedTxXdr: string; signerAddress: string }>;
  signAuthEntry: (
    authEntryXdr: string,
    opts?: { address?: string }
  ) => Promise<{ signedAuthEntry: string; signerAddress: string }>;
  signMessage: (
    message: string,
    opts?: { address?: string }
  ) => Promise<{ signedMessage: string; signerAddress: string }>;
  on: (event: string, callback: (data?: unknown) => void) => void;
  off: (event: string, callback: (data?: unknown) => void) => void;
}

declare global {
  interface Window {
    rozo?: RozoProvider;
  }
}

// Hook
export function useRozoWallet() {
  const [provider, setProvider] = useState<RozoProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // Check if provider exists
      if (window.rozo) {
        setProvider(window.rozo);
        await checkConnection(window.rozo);
        setIsLoading(false);
        return;
      }

      // Wait for provider
      const handleReady = async (event: CustomEvent) => {
        const rozo = event.detail.provider as RozoProvider;
        setProvider(rozo);
        await checkConnection(rozo);
        setIsLoading(false);
      };

      window.addEventListener('rozo:ready', handleReady as EventListener);

      // Timeout
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 3000);

      return () => {
        window.removeEventListener('rozo:ready', handleReady as EventListener);
        clearTimeout(timeout);
      };
    }

    async function checkConnection(rozo: RozoProvider) {
      try {
        const { isConnected } = await rozo.isConnected();
        setIsConnected(isConnected);

        if (isConnected) {
          const { address } = await rozo.getAddress();
          setAddress(address);
        }
      } catch (error) {
        console.error('Failed to check connection:', error);
      }
    }

    init();
  }, []);

  const signTransaction = useCallback(
    async (xdr: string, options?: { network?: string; submit?: boolean }) => {
      if (!provider) throw new Error('Wallet not available');
      return provider.signTransaction(xdr, options);
    },
    [provider]
  );

  const signAuthEntry = useCallback(
    async (authEntryXdr: string) => {
      if (!provider) throw new Error('Wallet not available');
      return provider.signAuthEntry(authEntryXdr);
    },
    [provider]
  );

  const signMessage = useCallback(
    async (message: string) => {
      if (!provider) throw new Error('Wallet not available');
      return provider.signMessage(message);
    },
    [provider]
  );

  return {
    provider,
    address,
    isConnected,
    isLoading,
    isAvailable: !!provider,
    signTransaction,
    signAuthEntry,
    signMessage,
  };
}

