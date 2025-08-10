// Shared utilities for Rozo Rewards MiniApp Edge Functions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ApiResponse, ERROR_CODES } from "./types.ts";

// Initialize Supabase client
export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// CORS headers
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Helper function to create API responses
export function createResponse<T>(
  data?: T,
  error?: { code: string; message: string; details?: Record<string, any> },
  status = 200
): Response {
  const response: ApiResponse<T> = {
    success: !error,
    ...(data && { data }),
    ...(error && { error }),
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Helper function to create error responses
export function createErrorResponse(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, any>
): Response {
  return createResponse(undefined, { code, message, details }, status);
}

// Helper function to validate required fields
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): string | null {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      return `Field '${field}' is required`;
    }
  }
  return null;
}

// Helper function to validate wallet address
export function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Helper function to validate transaction hash
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

// Helper function to validate email
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Helper function to get user from auth header
export async function getUserFromAuth(authHeader: string | null): Promise<{ user: any; error?: string }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.substring(7);
  
  try {
    // Check if it's our custom token format (base64 payload)
    if (token.includes('.')) {
      const [payloadBase64, signature] = token.split('.');
      
      try {
        const payload = JSON.parse(atob(payloadBase64));
        
        // Validate token expiry
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          return { user: null, error: "Token expired" };
        }
        
        // Validate required fields
        if (!payload.user_id || !payload.wallet_address) {
          return { user: null, error: "Invalid token payload" };
        }
        
        // Create a user object that matches Supabase format
        const user = {
          id: payload.user_id,
          user_metadata: {
            wallet_address: payload.wallet_address
          }
        };
        
        return { user };
      } catch (error) {
        return { user: null, error: "Invalid token format" };
      }
    }
    
    // Fallback to Supabase auth for other token formats
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error: "Invalid or expired token" };
    }

    return { user };
  } catch (error) {
    return { user: null, error: "Failed to authenticate user" };
  }
}

// Helper function to get user profile
export async function getUserProfile(userId: string) {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return profile;
}

// ROZO conversion utilities (1 ROZO = $0.01 USD, 100:1 conversion rate)
export function usdToRozo(usdAmount: number): number {
  return Math.floor(usdAmount * 100); // Convert to integer ROZO tokens
}

export function rozoToUsd(rozoAmount: number): number {
  return Math.round((rozoAmount / 100) * 100) / 100; // Convert to USD with 2 decimal places
}

// Helper function to calculate cashback in ROZO
export function calculateCashbackRozo(
  amountUsd: number,
  productCashbackRate: number,
  userTier: string
): { cashbackUsd: number; cashbackRozo: number; finalRate: number } {
  const tierMultiplier = {
    bronze: 1.0,
    silver: 1.2,
    gold: 1.5,
    platinum: 2.0,
  };

  const multiplier = tierMultiplier[userTier as keyof typeof tierMultiplier] || 1.0;
  const finalRate = productCashbackRate * multiplier;
  const cashbackUsd = Math.round(amountUsd * (finalRate / 100) * 100) / 100;
  const cashbackRozo = usdToRozo(cashbackUsd);
  
  return { cashbackUsd, cashbackRozo, finalRate };
}

// Legacy function for backward compatibility
export function calculateCashback(
  amount: number,
  merchantPercentage: number,
  userTier: string
): number {
  return calculateCashbackRozo(amount, merchantPercentage, userTier).cashbackUsd;
}

// Helper function to get tier based on total cashback earned
export function getUserTier(totalCashbackEarned: number): string {
  if (totalCashbackEarned >= 10000) return "platinum";
  if (totalCashbackEarned >= 2500) return "gold";
  if (totalCashbackEarned >= 500) return "silver";
  return "bronze";
}

// Helper function to validate pagination parameters
export function validatePagination(limit?: string, offset?: string) {
  const parsedLimit = limit ? parseInt(limit, 10) : 20;
  const parsedOffset = offset ? parseInt(offset, 10) : 0;

  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new Error("Limit must be between 1 and 100");
  }

  if (isNaN(parsedOffset) || parsedOffset < 0) {
    throw new Error("Offset must be 0 or greater");
  }

  return { limit: parsedLimit, offset: parsedOffset };
}

// Helper function to handle CORS preflight
export function handleCors(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

// Helper function to log errors
export function logError(context: string, error: any, details?: Record<string, any>) {
  console.error(`[${context}] Error:`, {
    error: error.message || error,
    stack: error.stack,
    details,
    timestamp: new Date().toISOString(),
  });
}

// Helper function to generate payment intent expiration
export function getPaymentIntentExpiration(minutes = 15): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// Helper function to check if payment intent is expired
export function isPaymentIntentExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

// Helper function to generate secure random string
export function generateSecureRandomString(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

// Helper function to validate chain ID
export function isValidChainId(chainId: number): boolean {
  const supportedChains = [1, 8453, 137, 10, 42161]; // Ethereum, Base, Polygon, Optimism, Arbitrum
  return supportedChains.includes(chainId);
}

// Helper function to get chain name
export function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    1: "Ethereum",
    8453: "Base",
    137: "Polygon",
    10: "Optimism",
    42161: "Arbitrum",
  };
  return chainNames[chainId] || "Unknown";
}

// Rate limiting helpers
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export function getRateLimitHeaders(
  key: string,
  maxRequests: number,
  windowMs: number
): Record<string, string> {
  const record = rateLimitStore.get(key);
  if (!record) {
    return {
      "X-RateLimit-Limit": maxRequests.toString(),
      "X-RateLimit-Remaining": (maxRequests - 1).toString(),
      "X-RateLimit-Reset": Math.ceil((Date.now() + windowMs) / 1000).toString(),
    };
  }

  return {
    "X-RateLimit-Limit": maxRequests.toString(),
    "X-RateLimit-Remaining": Math.max(0, maxRequests - record.count).toString(),
    "X-RateLimit-Reset": Math.ceil(record.resetTime / 1000).toString(),
  };
}
