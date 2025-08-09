// User profile management for Rozo Rewards MiniApp
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  getUserFromAuth,
  getUserProfile,
  isValidEmail,
  supabaseAdmin,
  logError,
  ERROR_CODES
} from "../_shared/utils.ts";
import { User } from "../_shared/types.ts";

interface UpdateProfileRequest {
  username?: string;
  email?: string;
  avatar_url?: string;
}

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Authenticate user
  const { user, error: authError } = await getUserFromAuth(
    req.headers.get("authorization")
  );

  if (authError || !user) {
    return createErrorResponse(
      ERROR_CODES.UNAUTHORIZED,
      authError || "Authentication required"
    );
  }

  try {
    if (req.method === "GET") {
      // Get user profile
      const profile = await getUserProfile(user.id);
      
      if (!profile) {
        return createErrorResponse(
          ERROR_CODES.NOT_FOUND,
          "User profile not found"
        );
      }

      const userResponse: User = {
        id: profile.id,
        wallet_address: profile.wallet_address,
        email: user.email,
        username: profile.username,
        avatar_url: profile.avatar_url,
        total_cashback_earned: parseFloat(profile.total_cashback_earned),
        total_cashback_claimed: parseFloat(profile.total_cashback_claimed),
        tier: profile.tier,
        referral_code: profile.referral_code,
        referred_by: profile.referred_by,
        metadata: profile.metadata,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };

      return createResponse(userResponse);

    } else if (req.method === "PUT") {
      // Update user profile
      const body: UpdateProfileRequest = await req.json();

      // Validate email format if provided
      if (body.email && !isValidEmail(body.email)) {
        return createErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid email format"
        );
      }

      // Validate username if provided
      if (body.username) {
        if (body.username.length < 3 || body.username.length > 50) {
          return createErrorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            "Username must be between 3 and 50 characters"
          );
        }

        // Check if username is already taken
        const { data: existingUser } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("username", body.username)
          .neq("id", user.id)
          .single();

        if (existingUser) {
          return createErrorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            "Username is already taken"
          );
        }
      }

      // Validate avatar URL if provided
      if (body.avatar_url && !body.avatar_url.startsWith("https://")) {
        return createErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Avatar URL must be a valid HTTPS URL"
        );
      }

      // Update profile
      const updateData: Partial<UpdateProfileRequest> = {};
      if (body.username !== undefined) updateData.username = body.username;
      if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;

      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", user.id)
        .select("*")
        .single();

      if (updateError) {
        logError("update-profile", updateError, { user_id: user.id });
        return createErrorResponse(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to update profile"
        );
      }

      // Update auth user email if provided
      if (body.email) {
        const { error: emailError } = await supabaseAdmin.auth.admin
          .updateUserById(user.id, { email: body.email });

        if (emailError) {
          logError("update-email", emailError, { user_id: user.id });
          return createErrorResponse(
            ERROR_CODES.INTERNAL_ERROR,
            "Failed to update email"
          );
        }
      }

      const userResponse: User = {
        id: updatedProfile.id,
        wallet_address: updatedProfile.wallet_address,
        email: body.email || user.email,
        username: updatedProfile.username,
        avatar_url: updatedProfile.avatar_url,
        total_cashback_earned: parseFloat(updatedProfile.total_cashback_earned),
        total_cashback_claimed: parseFloat(updatedProfile.total_cashback_claimed),
        tier: updatedProfile.tier,
        referral_code: updatedProfile.referral_code,
        referred_by: updatedProfile.referred_by,
        metadata: updatedProfile.metadata,
        created_at: updatedProfile.created_at,
        updated_at: updatedProfile.updated_at,
      };

      return createResponse(userResponse);

    } else {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Method not allowed",
        405
      );
    }

  } catch (error) {
    logError("user-profile", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
