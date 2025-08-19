import { useAccount, useReadContract, useBalance } from 'wagmi';
import { useState, useEffect } from 'react';

// USDC token address on Base
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export function useUSDCBalance() {
  const { address, isConnected } = useAccount();
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Get USDC balance
  const { data: balance, refetch: refetchBalance, error: balanceError } = useBalance({
    address: address,
    token: USDC_ADDRESS as `0x${string}`,
    query: {
      enabled: !!address,
    },
  });

  // Update local state when balance changes
  useEffect(() => {
    if (balance) {
      // Convert from wei to USDC (6 decimals)
      const balanceInUSDC = Number(balance.formatted);
      setUsdcBalance(balanceInUSDC);
    } else {
      setUsdcBalance(0);
    }
  }, [balance]);

  // Function to refresh balance
  const refreshBalance = async () => {
    await refetchBalance();
  };

  return {
    usdcBalance,
    isLoading: isLoading,
    refreshBalance,
    balanceError,
    isConnected,
  };
}
