import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, AUTH_COOKIE_NAME } from "@/lib/auth/core";

// Only run this middleware on the admin area and the leads admin operations.
export const config = {
  matcher: ["/admin/:path*", "/api/leads/:path*"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authenticated = await verifySessionToken(token);

  // Public lead submission (contact / service request form) — allow POST.
  if (pathname === "/api/leads" || pathname.startsWith("/api/leads")) {
    const method = request.method.toUpperCase();

    if (method === "POST") {
      return NextResponse.next();
    }

    if (!authenticated) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // Admin area.
  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}