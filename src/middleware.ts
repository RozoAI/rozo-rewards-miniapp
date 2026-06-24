import { LOCATIONS } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

const NS_ALIASES: Record<string, string> = {
  cafe: "nscafe",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nsMatch = pathname.match(/^\/ns\/([^/]+)(.*)/);
  if (nsMatch) {
    const handle = nsMatch[1];
    const rest = nsMatch[2];
    if (NS_ALIASES[handle]) {
      const target = new URL(`/ns/${NS_ALIASES[handle]}${rest}`, request.url);
      target.search = request.nextUrl.search;
      return NextResponse.redirect(target, { status: 301 });
    }
  }

  const id = pathname.replace(/^\/restaurant\//, "");
  const merchant = LOCATIONS.find((loc) => loc._id === id);
  if (merchant && "handle" in merchant && merchant.handle) {
    return NextResponse.redirect(
      new URL(`/ns/${merchant.handle}`, request.url),
      { status: 301 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/restaurant/:id*", "/ns/:handle*"],
};
