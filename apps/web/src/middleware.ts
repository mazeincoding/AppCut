import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "./env";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const protectedPaths = ["/editor", "/projects"];
  const sessionCookie = getSessionCookie(request);

  const canAccessProtectedPaths = (request: NextRequest) => {
    if (env.NODE_ENV === "development") {
      return true;
    }

    if (sessionCookie) {
      return true;
    }
    return false;
  };

  // Handle fuckcapcut.com domain redirect
  if (request.headers.get("host") === "fuckcapcut.com") {
    return NextResponse.redirect("https://opencut.app/why-not-capcut", 301);
  }

  const path = request.nextUrl.pathname;

  if (protectedPaths.includes(path) && !canAccessProtectedPaths(request)) {
    const homeUrl = new URL("/", request.url);
    homeUrl.searchParams.set("redirect", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
