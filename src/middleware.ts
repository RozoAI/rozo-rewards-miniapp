import { LOCATIONS } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: "/restaurant/:id*",
};
