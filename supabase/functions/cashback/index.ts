import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// // Merchant cashback ratios (in percentage)
// const MERCHANT_CASHBACK_RATIOS = {
//   'cafe': 1 / 100,
//   'spa': 5 / 100,
//   'meisan': 15 / 100,
//   'mart': 5 / 100,
//   'zen': 10 / 100,
//   'default': 0.0
// };
let cashbackRatio = 0.0;
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const url = new URL(req.url);
    const path = url.pathname;
    // POST /cashback - Admin endpoint for processing cashback
    if (req.method === "POST" && path === "/cashback") {
      const body = await req.json();
      // cashback_percent = [0, 100]
      // Validate required fields
      const { rozo_id, sol_address, evm_address, stellar_address, merchant_id, amount_in_usd, payment_reference, payment_method, cashback_percent } = body;
      if (!merchant_id || !amount_in_usd || !payment_reference || !payment_method) {
        return new Response(JSON.stringify({
          error: "Missing required fields"
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      cashbackRatio = (cashback_percent || 0.0) / 100;
      // Get cashback ratio for merchant
      // Process cashback using the database function
      const { data, error } = await supabase.rpc('process_cashback', {
        p_rozo_id: rozo_id || null,
        p_sol_address: sol_address || null,
        p_evm_address: evm_address || null,
        p_stellar_address: stellar_address || null,
        p_merchant_id: merchant_id,
        p_amount_in_usd: amount_in_usd,
        p_cashback_ratio: cashbackRatio,
        p_payment_reference: payment_reference,
        p_payment_method: payment_method
      });
      if (error) {
        console.error("Error processing cashback:", error);
        return new Response(JSON.stringify({
          error: "Failed to process cashback"
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        message: "Cashback processed successfully",
        data: data
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // GET /cashback - Get user balance
    if (req.method === "GET" && path === "/cashback") {
      const rozo_id = url.searchParams.get("rozo_id");
      const sol_address = url.searchParams.get("sol_address");
      const evm_address = url.searchParams.get("evm_address");
      const stellar_address = url.searchParams.get("stellar_address");
      if (!rozo_id && !sol_address && !evm_address && !stellar_address) {
        return new Response(JSON.stringify({
          error: "Must provide rozo_id, sol_address, evm_address, or stellar_address"
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      // Build query
      let query = supabase.from('points_userbalance').select('*');
      if (rozo_id) {
        query = query.eq('rozo_id', rozo_id);
      } else if (sol_address) {
        query = query.eq('sol_address', sol_address);
      } else if (evm_address) {
        query = query.eq('evm_address', evm_address);
      } else if (stellar_address) {
        query = query.eq('stellar_address', stellar_address);
      }
      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error("Error fetching user balance:", error);
        return new Response(JSON.stringify({
          error: "Failed to fetch user balance"
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      // if data not found, register a new user with 0 balance
      if (!data) {
        try {
          const { data: newData, error: insertError } = await supabase.from('points_userbalance').insert([
            {
              rozo_id: rozo_id || null,
              sol_address: sol_address || null,
              evm_address: evm_address || null,
              stellar_address: stellar_address || null,
              points: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);
        } catch (insertError) {
          console.error("Error inserting new user balance:", insertError);
        }
      }
      return new Response(JSON.stringify({
        success: true,
        balance: data || {
          points: 0,
          rozo_id,
          sol_address,
          evm_address,
          stellar_address
        }
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // GET /cashback/transactions - Get user transactions
    if (req.method === "GET" && path === "/cashback/transactions") {
      const rozo_id = url.searchParams.get("rozo_id");
      const sol_address = url.searchParams.get("sol_address");
      const evm_address = url.searchParams.get("evm_address");
      const stellar_address = url.searchParams.get("stellar_address");
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      if (!rozo_id && !sol_address && !evm_address && !stellar_address) {
        return new Response(JSON.stringify({
          error: "Must provide rozo_id, sol_address, evm_address, or stellar_address"
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      // Build query
      let query = supabase.from('points_transactions').select('*').order('created_at', {
        ascending: false
      }).range(offset, offset + limit - 1);
      if (rozo_id) {
        query = query.eq('rozo_id', rozo_id);
      } else if (sol_address) {
        query = query.eq('sol_address', sol_address);
      } else if (evm_address) {
        query = query.eq('evm_address', evm_address);
      } else if (stellar_address) {
        query = query.eq('stellar_address', stellar_address);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching transactions:", error);
        return new Response(JSON.stringify({
          error: "Failed to fetch transactions"
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        transactions: data || [],
        pagination: {
          limit,
          offset,
          total: data?.length || 0
        }
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Handle unknown routes
    return new Response(JSON.stringify({
      error: "Route not found"
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in cashback function:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
