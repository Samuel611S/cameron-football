import { type NextRequest, NextResponse } from "next/server"
import { allowedLeagueIds } from "@/config/leagues"

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = "/" + params.path.join("/")

    // Validate path format
    if (!path.startsWith("/league/") && !path.startsWith("/draft/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    // Extract and validate league ID if present
    const leagueMatch = path.match(/^\/league\/([^/]+)/)
    if (leagueMatch) {
      const leagueId = leagueMatch[1]
      if (!allowedLeagueIds.has(leagueId)) {
        return NextResponse.json({ error: "League not allowed" }, { status: 403 })
      }
    }

    const url = "https://api.sleeper.app/v1" + path
    const res = await fetch(url, {
      next: { revalidate: 600 },
      cache: "force-cache",
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Sleeper API error: ${res.status}` }, { status: res.status })
    }

    const raw = await res.text()

    // Generate hash for verification
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))
    const hash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const response = new NextResponse(raw, {
      headers: {
        "Content-Type": "application/json",
        "X-Data-Source": "sleeper",
        "X-Data-Hash": hash,
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
      },
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
