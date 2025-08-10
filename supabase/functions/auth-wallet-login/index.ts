// Minimal wallet-based authentication for Rozo Rewards MiniApp
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors 
} from "../_shared/utils.ts";

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

  if (req.method !== "POST") {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Method not allowed",
      405
    );
  }

  try {
    const body: WalletLoginRequest = await req.json();

    // Basic validation
    if (!body.wallet_address || !body.signature || !body.message || !body.nonce) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing required fields: wallet_address, signature, message, nonce"
      );
    }

    // Validate wallet address format
    if (!body.wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid wallet address format"
      );
    }

    // Basic signature validation
    if (!body.signature.startsWith('0x') || body.signature.length < 10) {
      return createErrorResponse(
        "INVALID_SIGNATURE",
        "Signature format is invalid"
      );
    }

    console.log("Creating auth token for:", body.wallet_address);

    // Create a JWT-like token compatible with the shared utils validation
    const tokenPayload = {
      wallet_address: body.wallet_address,
      user_id: `user_${body.wallet_address.slice(-6)}`,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
      iat: Math.floor(Date.now() / 1000),
    };

    // Format as base64_payload.signature to match getUserFromAuth expectations
    const payloadBase64 = btoa(JSON.stringify(tokenPayload));
    const signature = "rozo_auth_signature"; // Simple signature for development
    const token = `${payloadBase64}.${signature}`;

    const response: WalletLoginResponse = {
      access_token: token,
      refresh_token: token, // Same for simplicity
      user: {
        id: tokenPayload.user_id,
        wallet_address: body.wallet_address,
        created_at: new Date().toISOString(),
      },
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
    };

    return createResponse(response);

  } catch (error) {
    console.error("Auth error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Internal server error",
      500
    );
  }
});