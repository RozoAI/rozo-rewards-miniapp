import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createErrorResponse, createResponse, getUserFromAuth, handleCors } from "../_shared/utils.ts";

interface UpdateSpendPermissionRequest {
  authorized: boolean;
  allowance?: number;
  expiry?: string; // ISO timestamp
  signature?: string; // User signature for verification
}

interface SpendPermissionResponse {
  user_id: string;
  authorized: boolean;
  allowance: number;
  expiry: string | null;
  last_check: string;
  status: 'active' | 'expired' | 'unauthorized' | 'insufficient_allowance';
  recommendations: string[];
}

serve(async (req) => {
  console.log('🚀 Edge Function called:', req.method, req.url);
  
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log('✅ CORS handled, proceeding...');

  try {
    // Return test data directly for development (bypass all auth)
    console.log('🔧 Development mode: returning test data');
    
    const testResponse = {
      user_id: 'test-user-123',
      authorized: true,
      allowance: 100.0,
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      last_check: new Date().toISOString(),
      status: 'active',
      recommendations: [
        '✅ You have $100.00 authorized for spending',
        'Your spend permission is active and ready for payments',
        '🔧 Development mode: using test data'
      ]
    };

    console.log('📤 Returning test response:', testResponse);
    return createResponse(testResponse);

  } catch (error) {
    console.error('Spend permission error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});

async function getSpendPermissionStatus(supabaseClient: any, userId: string, user?: any) {
  try {
    console.log(`Getting spend permission status for user: ${userId}`);
    
    // Get user profile with spend permission info
    let { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Auto-create profile if it doesn't exist
    if (profileError || !profile) {
      console.log(`🔧 Creating profile for user ${userId}`);
      // Extract wallet address from the authenticated user object
      const walletAddress = user?.user_metadata?.wallet_address || '0x1234567890abcdef1234567890abcdef12345678';
      
      console.log(`🏗️ Auto-creating profile for user ${userId} with wallet ${walletAddress}`);
      
      const { error: createError } = await supabaseClient
        .from('profiles')
        .insert({
          id: userId,
          wallet_address: walletAddress,
          username: `User_${userId.slice(-6)}`,
          referral_code: `ROZO${userId.slice(-6).toUpperCase()}`,
          metadata: { created_via: 'api', auto_created: true }
        });
      
      if (createError) {
        console.error('Profile creation error:', createError);
        return createErrorResponse('User profile not found and could not be created', 404);
      }
      
      // Refetch the profile
      const { data: newProfile, error: refetchError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (refetchError || !newProfile) {
        return createErrorResponse('User profile not found', 404);
      }
      profile = newProfile;
    }

    // Get actual values with safe defaults
    const authorized = profile.spend_permission_authorized || false;
    const allowance = profile.spend_permission_allowance || 0;
    const expiry = profile.spend_permission_expiry ? new Date(profile.spend_permission_expiry) : null;
    
    const now = new Date();
    let status: 'active' | 'expired' | 'unauthorized' | 'insufficient_allowance' = 'unauthorized';
    const recommendations: string[] = [];

    if (authorized) {
      if (expiry && expiry > now) {
        if (allowance > 0) {
          status = 'active';
          recommendations.push(`✅ You have $${allowance.toFixed(2)} authorized for spending`);
          recommendations.push('Your spend permission is active and ready for payments');
        } else {
          status = 'insufficient_allowance';
          recommendations.push('Your allowance is $0. Please increase it to make payments');
        }
      } else {
        status = 'expired';
        recommendations.push('Your spend permission has expired. Please re-authorize');
      }
    } else {
      status = 'unauthorized';
      recommendations.push('Please authorize CDP Spend Permissions to enable one-tap payments');
      recommendations.push('This will allow secure, pre-authorized transactions');
      
      // Check USDC balance and add recommendations
      if (profile.wallet_address) {
        const usdcBalance = await checkUSDCBalance(profile.wallet_address);
        if (usdcBalance > 0) {
          recommendations.push(`💰 You have $${usdcBalance.toFixed(2)} USDC available for authorization`);
        } else {
          recommendations.push('❌ You need USDC in your wallet to authorize spending');
          recommendations.push('🔗 Add USDC to your Base wallet at bridge.base.org');
        }
      }
    }

    const response: SpendPermissionResponse = {
      user_id: userId,
      authorized,
      allowance,
      expiry: expiry?.toISOString() || null,
      last_check: profile.last_spend_permission_check || profile.updated_at,
      status,
      recommendations
    };

    return createResponse(response);

  } catch (error) {
    console.error('Get spend permission status error:', error);
    return createErrorResponse('Failed to get spend permission status', 500);
  }
}

async function updateSpendPermission(
  supabaseClient: any, 
  userId: string, 
  updateData: UpdateSpendPermissionRequest,
  user?: any
) {
  try {
    // Validate input
    if (typeof updateData.authorized !== 'boolean') {
      return createErrorResponse('Invalid authorized field', 400);
    }

    if (updateData.allowance !== undefined && (typeof updateData.allowance !== 'number' || updateData.allowance < 0)) {
      return createErrorResponse('Invalid allowance field', 400);
    }

    if (updateData.expiry !== undefined && isNaN(Date.parse(updateData.expiry))) {
      return createErrorResponse('Invalid expiry field', 400);
    }

    const allowance = updateData.allowance ?? 0;
    const expiry = updateData.expiry ? new Date(updateData.expiry) : null;

    // **NEW: Check user's actual USDC balance before allowing authorization**
    if (updateData.authorized && allowance > 0) {
      // Get user profile to get wallet address
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('wallet_address')
        .eq('id', userId)
        .single();

      if (profileError || !profile?.wallet_address) {
        return createErrorResponse('User profile or wallet address not found', 404);
      }

      // Check USDC balance on Base network
      const usdcBalance = await checkUSDCBalance(profile.wallet_address);
      
      console.log(`💰 USDC Balance Check: User ${userId} has $${usdcBalance}, requesting $${allowance}`);
      
      if (usdcBalance < allowance) {
        return createErrorResponse(
          'INSUFFICIENT_USDC_BALANCE',
          `❌ Insufficient USDC balance. You have $${usdcBalance.toFixed(2)} but need $${allowance.toFixed(2)}. Please add more USDC to your Base wallet before authorizing.`,
          400
        );
      }

      console.log(`✅ Balance verified: User has sufficient USDC ($${usdcBalance}) for authorization ($${allowance})`);
    }

    // TODO: Verify user signature if provided
    if (updateData.signature) {
      // const isValidSignature = await verifyUserSignature(userId, updateData.signature);
      // if (!isValidSignature) {
      //   return createErrorResponse('Invalid signature', 401);
      // }
    }

    // **NEW: Update the database with spend permission details**
    const { data: updateResult, error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        spend_permission_authorized: updateData.authorized,
        spend_permission_allowance: allowance,
        spend_permission_expiry: expiry?.toISOString(),
        last_spend_permission_check: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return createErrorResponse('Failed to save spend permission to database', 500);
    }

    console.log(`✅ Spend permission updated for user ${userId}:`, updateData);

    // Return updated status
    return await getSpendPermissionStatus(supabaseClient, userId, user);

  } catch (error) {
    console.error('Update spend permission error:', error);
    return createErrorResponse('Failed to update spend permission', 500);
  }
}

// Real CDP SDK verification
async function checkActualCdpPermission(walletAddress: string): Promise<any> {
  try {
    console.log(`🔍 Checking real CDP permission for ${walletAddress}`);
    
    // Import viem for blockchain calls (server-side compatible)
    const { createPublicClient, http, formatUnits } = await import('https://esm.sh/viem@2.21.44');
    const { base, baseSepolia } = await import('https://esm.sh/viem@2.21.44/chains');
    
    // Determine network and contracts - Use Base mainnet for production
    const isProduction = Deno.env.get('NODE_ENV') === 'production' || Deno.env.get('NEXT_PUBLIC_USE_MAINNET') === 'true';
    const chain = isProduction ? base : baseSepolia;
    const contracts = {
      SpendPermissionManager: '0xf85210B21cC50302F477BA56686d2019dC9b67Ad',
      USDC: isProduction 
        ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'  // Base Mainnet USDC
        : '0x036CbD53842c5426634e7929541eC2318f3dCF7e'  // Base Sepolia USDC
    };
    
    // Create public client for reading blockchain data
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Check user's USDC balance on-chain
    const usdcBalance = await publicClient.readContract({
      address: contracts.USDC,
      abi: [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        }
      ],
      functionName: 'balanceOf',
      args: [walletAddress],
    });

    const balanceUSD = parseFloat(formatUnits(usdcBalance, 6));
    console.log(`💰 Real USDC balance for ${walletAddress}: $${balanceUSD}`);

    // TODO: Check actual spend permission from SpendPermissionManager
    // For now, use mock spending data
    const currentSpending = 0;
    const dailyLimit = 20.0;
    const remaining = Math.max(0, dailyLimit - currentSpending);

    return {
      authorized: balanceUSD > 0, // User must have USDC to be authorized
      allowance: dailyLimit,
      remaining_today: remaining,
      usdc_balance: balanceUSD,
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      verified_onchain: true,
      chain: isProduction ? 'base' : 'base-sepolia'
    };

  } catch (error) {
    console.error('❌ CDP permission check failed:', error);
    
    // Fallback to mock data for development
    console.log('🔧 Falling back to mock data due to CDP error');
    return {
      authorized: true,
      allowance: 20.0,
      remaining_today: 20.0,
      usdc_balance: 100.0,
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      verified_onchain: false,
      error: error.message
    };
  }
}

// **NEW: Check user's actual USDC balance on Base network**
async function checkUSDCBalance(userAddress: string): Promise<number> {
  const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const BASE_RPC_URL = "https://mainnet.base.org";
  
  try {
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
    
    console.log(`💰 USDC Balance for ${userAddress}: $${balanceUsdc}`);
    return balanceUsdc;
  } catch (error) {
    console.error('Failed to fetch USDC balance:', error);
    return 0; // Return 0 on error - will trigger insufficient balance error
  }
}

// TODO: Implement signature verification
async function verifyUserSignature(userId: string, signature: string): Promise<boolean> {
  try {
    // Example implementation:
    // - Get user's wallet address from profile
    // - Verify the signature was made by that wallet
    // - Check message content for authorization intent
    
    console.log(`Verifying signature for user ${userId}: ${signature}`);
    return true; // Development mode
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}
