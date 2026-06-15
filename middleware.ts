import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    const from = request.nextUrl.pathname + request.nextUrl.search;
    if (from && from !== "/") {
      loginUrl.searchParams.set("from", from);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/menu/:path*",
    "/customizations/:path*",
    "/settings/:path*",
    "/orders/:path*",
    "/leads/:path*",
    "/chat/:path*",
    "/api/restaurant",
    "/api/menu/:path*",
    "/api/categories/:path*",
    "/api/customizations/:path*",
    "/api/hours",
    "/api/taxes",
    "/api/faqs/:path*",
    "/api/orders/:path*",
    "/api/leads",
  ],
};
