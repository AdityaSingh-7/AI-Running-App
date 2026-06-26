import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/run", "/history", "/settings"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth API routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isProtected) {
    // Check for NextAuth session token
    const token =
      request.cookies.get("authjs.session-token") ??
      request.cookies.get("__Secure-authjs.session-token");

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/run/:path*",
    "/history/:path*",
    "/settings/:path*",
  ],
};
