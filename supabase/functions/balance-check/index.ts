// Check user's actual USDC balance on Base network
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors,
  getUserFromAuth 
} from "../_shared/utils.ts";

interface BalanceCheckRequest {
  amount_usd: number;
}

interface BalanceCheckResponse {
  user_address: string;
  current_usdc_balance: number;
  requested_amount: number;
  has_sufficient_funds: boolean;
  shortfall?: number;
  recommendations: string[];
}

// USDC contract address on Base network
const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_RPC_URL = "https://mainnet.base.org";

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Method not allowed",
      405
    );
  }

  try {
    // Authenticate user
    const { user, error: authError } = await getUserFromAuth(req.headers.get("authorization"));
    if (authError || !user) {
      return createErrorResponse('Authentication required', 401);
    }

    const { amount_usd }: BalanceCheckRequest = await req.json();
    
    // Validate input
    if (typeof amount_usd !== 'number' || amount_usd <= 0) {
      return createErrorResponse(
        "VALIDATION_ERROR", 
        "Invalid amount_usd. Must be a positive number"
      );
    }

    // Get user's wallet address
    const userAddress = user.wallet_address;
    if (!userAddress) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "User wallet address not found"
      );
    }

    // Check USDC balance on Base network
    const usdcBalance = await getUSDCBalance(userAddress);
    
    const hasSufficientFunds = usdcBalance >= amount_usd;
    const shortfall = hasSufficientFunds ? undefined : amount_usd - usdcBalance;
    
    const recommendations: string[] = [];
    
    if (hasSufficientFunds) {
      recommendations.push(`✅ You have sufficient USDC ($${usdcBalance.toFixed(2)}) for this authorization`);
      recommendations.push(`After authorization, you'll have $${(usdcBalance - amount_usd).toFixed(2)} remaining`);
    } else {
      recommendations.push(`❌ Insufficient USDC balance. You need $${shortfall?.toFixed(2)} more`);
      recommendations.push(`💰 Add USDC to your Base wallet to complete this authorization`);
      recommendations.push(`🔗 You can bridge USDC to Base at bridge.base.org`);
    }

    const response: BalanceCheckResponse = {
      user_address: userAddress,
      current_usdc_balance: usdcBalance,
      requested_amount: amount_usd,
      has_sufficient_funds: hasSufficientFunds,
      shortfall,
      recommendations
    };

    return createResponse(response);

  } catch (error) {
    console.error('Balance check error:', error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to check balance",
      500
    );
  }
});

async function getUSDCBalance(userAddress: string): Promise<number> {
  try {
    // Call Base RPC to get USDC balance
    const response = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: BASE_USDC_ADDRESS,
            data: `0x70a08231000000000000000000000000${userAddress.slice(2)}` // balanceOf(address)
          },
          'latest'
        ],
        id: 1
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('RPC Error:', data.error);
      return 0;
    }

    // Convert hex result to decimal (USDC has 6 decimals)
    const balanceHex = data.result;
    const balanceWei = BigInt(balanceHex);
    const balanceUsdc = Number(balanceWei) / 1_000_000; // USDC has 6 decimals
    
    return balanceUsdc;
  } catch (error) {
    console.error('Failed to fetch USDC balance:', error);
    // Return 0 on error - user should be warned about this
    return 0;
  }
}
