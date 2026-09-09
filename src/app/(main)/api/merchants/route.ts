import { getAllRestaurants } from "@/lib/restaurants";
import type { NextRequest } from "next/server";

// Public merchant directory: everything listed under the "Network Schools"
// filter on /discovery (all non-hidden merchants). AI Services are excluded —
// they come from a separate data source and are internal to the app.
export async function GET(_req: NextRequest) {
  // NEXT_PUBLIC_URL is the codebase-wide base (og route uses it); fall back to
  // the request origin when unset.
  const baseUrl =
    process.env.NEXT_PUBLIC_URL || new URL(_req.url).origin;
  const merchants = getAllRestaurants().map((m) => ({
    id: m._id,
    name: m.name,
    handle: m.handle,
    description: m.formatted,
    payment_page_url: `${baseUrl}/ns/${m.handle}`,
    address_line1: m.address_line1,
    address_line2: m.address_line2,
    lat: m.lat,
    lon: m.lon,
    logo_url: m.logo_url,
    cashback_rate: m.cashback_rate,
    price: m.price ?? null,
    currency: m.currency ?? null,
    is_live: m.is_live ?? false,
    website: m.website ?? null,
    whatsapp: m.whatsapp ?? null,
    host: m.host ?? null,
  }));

  return Response.json(
    { merchants },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}

// Preflight support so cross-origin browser clients sending custom headers
// don't fail with 405.
export async function OPTIONS(_req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
