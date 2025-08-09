import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createErrorResponse, createSuccessResponse } from "../_shared/utils.ts";

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

    if (req.method === 'GET') {
      // Get current spend permission status
      return await getSpendPermissionStatus(supabaseClient, user.id);
    } else if (req.method === 'POST') {
      // Update spend permission
      const updateData: UpdateSpendPermissionRequest = await req.json();
      return await updateSpendPermission(supabaseClient, user.id, updateData);
    } else {
      return createErrorResponse('Method not allowed', 405);
    }

  } catch (error) {
    console.error('Spend permission error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});

async function getSpendPermissionStatus(supabaseClient: any, userId: string) {
  try {
    // Get user profile with spend permission info
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return createErrorResponse('User profile not found', 404);
    }

    // TODO: Optionally verify with actual CDP SDK
    // const actualPermission = await checkActualCdpPermission(profile.wallet_address);

    const now = new Date();
    const expiry = profile.spend_permission_expiry ? new Date(profile.spend_permission_expiry) : null;
    
    let status: 'active' | 'expired' | 'unauthorized' | 'insufficient_allowance' = 'unauthorized';
    const recommendations: string[] = [];

    if (profile.spend_permission_authorized) {
      if (expiry && expiry > now) {
        if (profile.spend_permission_allowance > 0) {
          status = 'active';
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
    }

    const response: SpendPermissionResponse = {
      user_id: userId,
      authorized: profile.spend_permission_authorized || false,
      allowance: profile.spend_permission_allowance || 0,
      expiry: profile.spend_permission_expiry,
      last_check: profile.last_spend_permission_check || profile.updated_at,
      status,
      recommendations
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Get spend permission status error:', error);
    return createErrorResponse('Failed to get spend permission status', 500);
  }
}

async function updateSpendPermission(
  supabaseClient: any, 
  userId: string, 
  updateData: UpdateSpendPermissionRequest
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

    // TODO: Verify user signature if provided
    if (updateData.signature) {
      // const isValidSignature = await verifyUserSignature(userId, updateData.signature);
      // if (!isValidSignature) {
      //   return createErrorResponse('Invalid signature', 401);
      // }
    }

    const allowance = updateData.allowance ?? 0;
    const expiry = updateData.expiry ? new Date(updateData.expiry) : null;

    // Update spend permission using database function
    const { data: updateResult, error: updateError } = await supabaseClient.rpc(
      'update_spend_permission',
      {
        p_user_id: userId,
        p_authorized: updateData.authorized,
        p_allowance: allowance,
        p_expiry: expiry
      }
    );

    if (updateError) {
      console.error('Update spend permission error:', updateError);
      return createErrorResponse('Failed to update spend permission', 500);
    }

    if (!updateResult) {
      return createErrorResponse('User not found', 404);
    }

    // Return updated status
    return await getSpendPermissionStatus(supabaseClient, userId);

  } catch (error) {
    console.error('Update spend permission error:', error);
    return createErrorResponse('Failed to update spend permission', 500);
  }
}

// TODO: Implement actual CDP SDK verification
async function checkActualCdpPermission(walletAddress: string): Promise<any> {
  try {
    // Example implementation:
    // const cdpSdk = new CdpSdk();
    // const permission = await cdpSdk.getSpendPermission({
    //   account: walletAddress,
    //   spender: ROZO_PAYMASTER_ADDRESS,
    //   token: USDC_ADDRESS
    // });
    // return permission;
    
    console.log(`Checking actual CDP permission for ${walletAddress}`);
    return { allowance: 0, expiry: 0 }; // Development mode
  } catch (error) {
    console.error('CDP permission check error:', error);
    return null;
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
