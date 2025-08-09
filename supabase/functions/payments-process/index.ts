import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createErrorResponse, createSuccessResponse } from "../_shared/utils.ts";
import type { User, Transaction } from "../_shared/types.ts";

// Constants for RozoPayMaster integration
const ROZO_PAYMASTER_ADDRESS = "0xRozoPayMaster"; // TODO: Replace with actual contract address
const USDC_ADDRESS = "0xA0b86a33E6441BcA5ba4b1C56f57A2E238DDd9C"; // Base USDC
const TREASURY_WALLET = Deno.env.get('TREASURY_WALLET_ADDRESS');
const TREASURY_PRIVATE_KEY = Deno.env.get('TREASURY_PRIVATE_KEY');

interface ProcessPaymentRequest {
  receiver: string;           // Merchant wallet address
  cashback_rate: number;      // Percentage (e.g., 1, 5)
  amount: number;             // USD amount
  is_using_credit: boolean;   // true = use ROZO credits, false = direct payment
  user_signature?: string;    // Optional: for additional verification
  nonce?: string;            // Optional: for replay protection
}

interface ProcessPaymentResponse {
  transaction_id: string;
  payment_method: "direct_usdc" | "rozo_credit";
  amount_paid_usd: number;
  rozo_balance_change: number; // Positive for earned, negative for spent
  new_rozo_balance: number;
  cashback_earned?: number;    // Only for direct payments
  tx_hash?: string;           // Only for direct payments
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return createErrorResponse('Missing authorization header', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return createErrorResponse('Invalid token', 401);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return createErrorResponse('User profile not found', 404);
    }

    // Parse request body
    const { receiver, cashback_rate, amount, is_using_credit, user_signature, nonce }: ProcessPaymentRequest = await req.json();

    // Validate input parameters
    if (!receiver || typeof cashback_rate !== 'number' || typeof amount !== 'number' || typeof is_using_credit !== 'boolean') {
      return createErrorResponse('Invalid request parameters', 400);
    }

    if (amount <= 0 || cashback_rate < 0 || cashback_rate > 100) {
      return createErrorResponse('Invalid amount or cashback rate', 400);
    }

    // Validate receiver address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(receiver)) {
      return createErrorResponse('Invalid receiver address format', 400);
    }

    let result: ProcessPaymentResponse;

    if (is_using_credit) {
      // ROZO Credit Payment Mode
      result = await processRozoCreditPayment(supabaseClient, profile, receiver, amount, cashback_rate, nonce);
    } else {
      // Direct USDC Payment Mode
      result = await processDirectPayment(supabaseClient, profile, receiver, amount, cashback_rate, user_signature);
    }

    return createSuccessResponse(result);

  } catch (error) {
    console.error('Payment processing error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});

async function processRozoCreditPayment(
  supabaseClient: any,
  profile: User,
  receiver: string,
  amount: number,
  cashback_rate: number,
  nonce?: string
): Promise<ProcessPaymentResponse> {
  // Calculate ROZO cost (amount * 100)
  const rozoCost = Math.floor(amount * 100);

  // Check if user has sufficient ROZO balance
  if (profile.available_cashback_rozo < rozoCost) {
    throw new Error(`Insufficient ROZO balance. Required: ${rozoCost}, Available: ${profile.available_cashback_rozo}`);
  }

  // Start transaction
  const { data: transactionResult, error: transactionError } = await supabaseClient.rpc(
    'process_rozo_credit_payment',
    {
      p_user_id: profile.id,
      p_receiver: receiver,
      p_amount_usd: amount,
      p_rozo_cost: rozoCost,
      p_cashback_rate: cashback_rate,
      p_nonce: nonce || `rozo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  );

  if (transactionError) {
    console.error('ROZO credit payment error:', transactionError);
    throw new Error('Failed to process ROZO credit payment');
  }

  // TODO: Execute internal payment from treasury to receiver
  // This would involve calling our treasury smart contract or payment processor
  await executeInternalPayment(receiver, amount);

  return {
    transaction_id: transactionResult.transaction_id,
    payment_method: "rozo_credit",
    amount_paid_usd: amount,
    rozo_balance_change: -rozoCost,
    new_rozo_balance: profile.available_cashback_rozo - rozoCost,
  };
}

async function processDirectPayment(
  supabaseClient: any,
  profile: User,
  receiver: string,
  amount: number,
  cashback_rate: number,
  user_signature?: string
): Promise<ProcessPaymentResponse> {
  // Check CDP Spend Permission
  const hasPermission = await checkCdpSpendPermission(profile.wallet_address);
  if (!hasPermission) {
    throw new Error('User does not have valid CDP Spend Permission. Please re-authorize.');
  }

  // Calculate cashback in ROZO tokens
  const tierMultiplier = getTierMultiplier(profile.tier);
  const finalCashbackRate = cashback_rate * tierMultiplier;
  const cashbackRozo = Math.floor(amount * (finalCashbackRate / 100) * 100);

  // Execute blockchain payment through RozoPayMaster
  const txHash = await executeRozoPayMasterPayment(profile.wallet_address, receiver, amount, user_signature);

  // Record transaction and update balances
  const { data: transactionResult, error: transactionError } = await supabaseClient.rpc(
    'process_direct_payment',
    {
      p_user_id: profile.id,
      p_receiver: receiver,
      p_amount_usd: amount,
      p_cashback_rozo: cashbackRozo,
      p_cashback_rate: finalCashbackRate,
      p_tx_hash: txHash,
      p_chain_id: 8453 // Base
    }
  );

  if (transactionError) {
    console.error('Direct payment recording error:', transactionError);
    throw new Error('Failed to record direct payment');
  }

  return {
    transaction_id: transactionResult.transaction_id,
    payment_method: "direct_usdc",
    amount_paid_usd: amount,
    rozo_balance_change: cashbackRozo,
    new_rozo_balance: profile.available_cashback_rozo + cashbackRozo,
    cashback_earned: cashbackRozo,
    tx_hash: txHash,
  };
}

async function checkCdpSpendPermission(userAddress: string): Promise<boolean> {
  try {
    // TODO: Implement actual CDP SDK call
    // For now, return true for development
    console.log(`Checking CDP spend permission for ${userAddress}`);
    
    // Example implementation:
    // const permission = await cdpSdk.getSpendPermission({
    //   account: userAddress,
    //   spender: ROZO_PAYMASTER_ADDRESS,
    //   token: USDC_ADDRESS
    // });
    // return permission.allowance > 0 && permission.expiry > Date.now();
    
    return true; // Development mode
  } catch (error) {
    console.error('CDP permission check error:', error);
    return false;
  }
}

async function executeRozoPayMasterPayment(
  userAddress: string,
  receiver: string,
  amount: number,
  signature?: string
): Promise<string> {
  try {
    // TODO: Implement actual RozoPayMaster contract call
    console.log(`Executing RozoPayMaster payment: ${userAddress} -> ${receiver}, amount: ${amount}`);
    
    // Example implementation:
    // const contract = new ethers.Contract(ROZO_PAYMASTER_ADDRESS, abi, provider);
    // const tx = await contract.processPayment(userAddress, receiver, ethers.utils.parseUnits(amount.toString(), 6), signature);
    // await tx.wait();
    // return tx.hash;
    
    // Development mode - return mock transaction hash
    return `0x${Math.random().toString(16).substr(2, 64)}`;
  } catch (error) {
    console.error('RozoPayMaster payment error:', error);
    throw new Error('Failed to execute blockchain payment');
  }
}

async function executeInternalPayment(receiver: string, amount: number): Promise<void> {
  try {
    // TODO: Implement internal payment from treasury
    console.log(`Executing internal payment from treasury to ${receiver}: $${amount}`);
    
    // Example implementation:
    // - Use treasury wallet to send USDC to receiver
    // - Could be through a smart contract or direct transfer
    // - Log the transaction for accounting
    
    // Development mode - just log
    console.log('Internal payment executed successfully');
  } catch (error) {
    console.error('Internal payment error:', error);
    throw new Error('Failed to execute internal payment');
  }
}

function getTierMultiplier(tier: string): number {
  const multipliers = {
    bronze: 1.0,
    silver: 1.2,
    gold: 1.5,
    platinum: 2.0,
  };
  return multipliers[tier as keyof typeof multipliers] || 1.0;
}
