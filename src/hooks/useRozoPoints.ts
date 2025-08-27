import { ROZO_POINTS_ABI, ROZO_POINTS_CONTRACT_ADDRESS } from "@/lib/contracts";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

// USDC token address on Base
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// USDC ABI for approval
const USDC_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function useRozoPoints() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [points, setPoints] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Base chain ID is 8453
  const isOnBaseChain = chainId === 8453;

  // Read user's points balance
  const {
    data: userPoints,
    refetch: refetchPoints,
    error: pointsError,
  } = useReadContract({
    address: ROZO_POINTS_CONTRACT_ADDRESS as `0x${string}`,
    abi: ROZO_POINTS_ABI,
    functionName: "getUserPoints",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isOnBaseChain,
    },
  });

  // Write contract for purchase
  const {
    data: purchaseHash,
    writeContract: purchase,
    isPending: isPurchasing,
  } = useWriteContract();

  // Write contract for redeem with points
  const {
    data: redeemHash,
    writeContract: redeemWithPoints,
    isPending: isRedeeming,
  } = useWriteContract();

  // Write contract for USDC approval
  const {
    data: approveHash,
    writeContract: approveUSDC,
    isPending: isApproving,
  } = useWriteContract();

  // Check USDC allowance
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: "allowance",
    args:
      address && isOnBaseChain
        ? [address, ROZO_POINTS_CONTRACT_ADDRESS as `0x${string}`]
        : undefined,
    query: {
      enabled: !!address && isOnBaseChain,
    },
  });

  // Wait for purchase transaction
  const {
    isLoading: isPurchaseTransactionLoading,
    isSuccess: isPurchaseSuccess,
  } = useWaitForTransactionReceipt({
    hash: purchaseHash,
  });

  // Wait for redeem transaction
  const { isLoading: isRedeemTransactionLoading, isSuccess: isRedeemSuccess } =
    useWaitForTransactionReceipt({
      hash: redeemHash,
    });

  // Wait for approval transaction
  const {
    isLoading: isApproveTransactionLoading,
    isSuccess: isApproveSuccess,
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Update local state when contract data changes
  useEffect(() => {
    if (userPoints !== undefined) {
      setPoints(Number(userPoints));
    } else if (pointsError) {
      // If contract call fails, assume 0 points for new users
      console.log("Contract call failed, assuming 0 points for new user");
      setPoints(0);
    }
  }, [userPoints, pointsError]);

  // Auto-switch to Base when connected but on wrong network
  useEffect(() => {
    if (isConnected && !isOnBaseChain && !isSwitching) {
      console.log("Auto-switching to Base network...");
      switchToBase();
    }
  }, [isConnected, isOnBaseChain, isSwitching]);

  // Handle successful purchase
  useEffect(() => {
    if (isPurchaseSuccess) {
      toast.success("Purchase successful! Check your ROZO points balance");
      refetchPoints();
    }
  }, [isPurchaseSuccess, refetchPoints]);

  // Handle successful redeem
  useEffect(() => {
    if (isRedeemSuccess) {
      toast.success("Redeem successful! Points deducted from your balance");
      refetchPoints();
    }
  }, [isRedeemSuccess, refetchPoints]);

  // Handle successful approval
  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("USDC approval successful! You can now make purchases");
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  // Function to approve USDC spending
  const approveUSDCSpending = async (amount: number) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isOnBaseChain) {
      toast.error("Please switch to Base network");
      return;
    }

    try {
      setIsLoading(true);
      approveUSDC({
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: "approve",
        args: [
          ROZO_POINTS_CONTRACT_ADDRESS as `0x${string}`,
          BigInt(amount * 1000000),
        ], // Convert to USDC decimals (6)
      });
    } catch (error) {
      console.error("Error approving USDC:", error);
      toast.error("Failed to approve USDC spending");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to purchase with USDC
  const purchaseWithUSDC = async (merchantId: number, amount: number) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isOnBaseChain) {
      toast.error("Please switch to Base network");
      return;
    }

    const amountInWei = BigInt(amount * 1000000); // Convert to USDC decimals (6)
    const currentAllowance = usdcAllowance || BigInt(0);

    // Check if approval is needed
    if (currentAllowance < amountInWei) {
      toast.info("Approval required. Please approve USDC spending first.");
      await approveUSDCSpending(amount);
      return;
    }

    console.log("amount", amount, merchantId);
    try {
      setIsLoading(true);
      purchase({
        address: ROZO_POINTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: ROZO_POINTS_ABI,
        functionName: "purchase",
        args: [BigInt(merchantId), amountInWei],
      });
    } catch (error) {
      console.error("Error making purchase:", error);
      toast.error("Failed to make purchase");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to redeem with points
  const redeemUsingPoints = async (merchantId: number, itemPrice: number) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isOnBaseChain) {
      toast.error("Please switch to Base network");
      return;
    }

    const requiredPoints = itemPrice * 100; // 100 points = 1 USDC
    if (points < requiredPoints) {
      toast.error(
        `Insufficient points. You need ${requiredPoints} points but have ${points}`
      );
      return;
    }

    try {
      setIsLoading(true);
      redeemWithPoints({
        address: ROZO_POINTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: ROZO_POINTS_ABI,
        functionName: "redeemWithPoints",
        args: [BigInt(merchantId), BigInt(itemPrice * 1000000)], // Convert to USDC decimals (6)
      });
    } catch (error) {
      console.error("Error redeeming with points:", error);
      toast.error("Failed to redeem with points");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to switch to Base network
  const switchToBase = async () => {
    try {
      await switchChain({ chainId: 8453 });
      toast.success("Switched to Base network");
    } catch (error) {
      console.error("Failed to switch to Base:", error);
      toast.error("Failed to switch to Base network");
    }
  };

  // Function to refresh data
  const refreshData = async () => {
    await Promise.all([refetchPoints(), refetchAllowance()]);
  };

  return {
    points,
    isLoading:
      isLoading ||
      isPurchasing ||
      isPurchaseTransactionLoading ||
      isRedeeming ||
      isRedeemTransactionLoading ||
      isApproving ||
      isApproveTransactionLoading,
    purchaseWithUSDC,
    approveUSDCSpending,
    redeemUsingPoints,
    refreshData,
    isConnected,
    isOnBaseChain,
    switchToBase,
    isSwitching,
    usdcAllowance,
    // Debug values
    debug: {
      address,
      isConnected,
      userPoints,
      chainId,
      pointsError,
      isOnBaseChain,
    },
  };
}
