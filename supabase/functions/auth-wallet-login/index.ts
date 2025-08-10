// Wallet-based authentication for Rozo Rewards MiniApp
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  validateRequiredFields,
  isValidWalletAddress,
  supabaseAdmin,
  logError,
  checkRateLimit,
  getRateLimitHeaders,
  ERROR_CODES
} from "../_shared/utils.ts";

// Import for signature verification
import { verifyMessage } from "https://esm.sh/viem@2.21.1";

interface WalletLoginRequest {
  wallet_address: string;
  signature: string;
  message: string;
  nonce: string;
}

interface WalletLoginResponse {
  access_token: string;
  refresh_token: string;
  user: any;
  expires_in: number;
}

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Rate limiting
  const clientIP = req.headers.get("x-forwarded-for") || "unknown";
  const rateLimitKey = `wallet-login:${clientIP}`;
  
  if (!checkRateLimit(rateLimitKey, 10, 60000)) { // 10 requests per minute
    const headers = getRateLimitHeaders(rateLimitKey, 10, 60000);
    return createErrorResponse(
      ERROR_CODES.RATE_LIMITED,
      "Too many login attempts. Please try again later.",
      429
    );
  }

  if (req.method !== "POST") {
    return createErrorResponse(
      ERROR_CODES.VALIDATION_ERROR,
      "Method not allowed",
      405
    );
  }

  try {
    const body: WalletLoginRequest = await req.json();

    // Validate required fields
    const validationError = validateRequiredFields(body, [
      "wallet_address",
      "signature", 
      "message",
      "nonce"
    ]);

    if (validationError) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        validationError
      );
    }

    // Validate wallet address format
    if (!isValidWalletAddress(body.wallet_address)) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid wallet address format"
      );
    }

    // Verify the message signature
    try {
      const isValidSignature = await verifyMessage({
        address: body.wallet_address as `0x${string}`,
        message: body.message,
        signature: body.signature as `0x${string}`,
      });

      if (!isValidSignature) {
        return createErrorResponse(
          ERROR_CODES.INVALID_SIGNATURE,
          "Invalid signature"
        );
      }
    } catch (error) {
      logError("signature-verification", error, { wallet_address: body.wallet_address });
      return createErrorResponse(
        ERROR_CODES.INVALID_SIGNATURE,
        "Failed to verify signature"
      );
    }

    // Check if user already exists
    let { data: existingUser, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      logError("list-users", userError);
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to check existing users"
      );
    }

    // Find user by wallet address in metadata
    const user = existingUser.users.find(u => 
      u.user_metadata?.wallet_address === body.wallet_address
    );

    let authUser;
    let isNewUser = false;

    if (user) {
      // User exists, create session
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin
        .generateLink({
          type: 'magiclink',
          email: `${body.wallet_address}@rozo.internal`,
          options: {
            redirectTo: undefined,
          }
        });

      if (sessionError) {
        logError("generate-session", sessionError);
        return createErrorResponse(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to create session"
        );
      }

      authUser = user;
    } else {
      // Create new user
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin
        .createUser({
          email: `${body.wallet_address}@rozo.internal`,
          password: body.wallet_address, // Use wallet address as password
          email_confirm: true,
          user_metadata: {
            wallet_address: body.wallet_address,
          },
        });

      if (createError) {
        logError("create-user", createError, { wallet_address: body.wallet_address });
        return createErrorResponse(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to create user account"
        );
      }

      authUser = newUserData.user;
      isNewUser = true;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") { // Not found error is OK for new users
      logError("fetch-profile", profileError);
    }

    // Create a simple JWT token payload
    const payload = {
      user_id: authUser.id,
      wallet_address: body.wallet_address,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    };

    // For simplicity, create a basic signed token (in production, use proper JWT signing)
    const tokenPayload = btoa(JSON.stringify(payload));
    const signature = btoa(`rozo_${authUser.id}_${Date.now()}`);
    const accessToken = `${tokenPayload}.${signature}`;

    const response: WalletLoginResponse = {
      access_token: accessToken,
      refresh_token: "", // Supabase will handle refresh tokens
      user: {
        id: authUser.id,
        wallet_address: body.wallet_address,
        email: authUser.email,
        username: profile?.username || null,
        avatar_url: profile?.avatar_url || null,
        total_cashback_earned: profile?.total_cashback_earned || 0,
        total_cashback_claimed: profile?.total_cashback_claimed || 0,
        tier: profile?.tier || 'bronze',
        referral_code: profile?.referral_code || null,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at,
        is_new_user: isNewUser,
      },
      expires_in: 3600, // 1 hour
    };

    return createResponse(response);

  } catch (error) {
    logError("wallet-login", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
