import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "no-referrer")
  response.headers.set("X-Frame-Options", "DENY")

  // Validate API routes
  if (request.nextUrl.pathname.startsWith("/api/sleeper/")) {
    const pathSegments = request.nextUrl.pathname.split("/")

    // Block invalid paths
    if (pathSegments.length < 4 || (!pathSegments[3].startsWith("league") && !pathSegments[3].startsWith("draft"))) {
      return NextResponse.json({ error: "Invalid API path" }, { status: 400 })
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)", "/api/:path*"],
}
