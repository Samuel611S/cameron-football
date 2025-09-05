import "server-only"
import { allowedLeagueIds } from "@/config/leagues"

const BASE = "https://api.sleeper.app/v1"

async function fetchSleeper(path: string, revalidate = 600) {
  if (!path.startsWith("/league/") && !path.startsWith("/draft/")) {
    throw new Error("blocked path")
  }

  const url = BASE + path
  console.log("[v0] Fetching Sleeper API:", url)

  const res = await fetch(url, {
    next: { revalidate },
    cache: "force-cache",
  })

  if (!res.ok) {
    throw new Error(`Sleeper ${res.status} ${path}`)
  }

  const raw = await res.text()

  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))
  const hash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return { json: JSON.parse(raw), hash, url }
}

function validateLeagueId(leagueId: string): string {
  if (!allowedLeagueIds.has(leagueId)) {
    throw new Error(`League ID not allowed: ${leagueId}`)
  }
  return leagueId
}

function sanitizeWeek(week?: number | string): number {
  const weekNum = Number(week || 1)
  return Math.max(1, Math.min(18, weekNum))
}

export async function getLeague(leagueId: string) {
  const validatedId = validateLeagueId(leagueId)
  const { json, hash, url } = await fetchSleeper(`/league/${validatedId}`)
  return { data: json, hash, url, fetchTime: new Date() }
}

export async function getUsers(leagueId: string) {
  const validatedId = validateLeagueId(leagueId)
  const { json, hash, url } = await fetchSleeper(`/league/${validatedId}/users`)
  return { data: json, hash, url, fetchTime: new Date() }
}

export async function getRosters(leagueId: string) {
  const validatedId = validateLeagueId(leagueId)
  const { json, hash, url } = await fetchSleeper(`/league/${validatedId}/rosters`)
  return { data: json, hash, url, fetchTime: new Date() }
}

export async function getMatchups(leagueId: string, week: number) {
  const validatedId = validateLeagueId(leagueId)
  const sanitizedWeek = sanitizeWeek(week)
  const { json, hash, url } = await fetchSleeper(`/league/${validatedId}/matchups/${sanitizedWeek}`)
  return { data: json, hash, url, fetchTime: new Date() }
}

export async function getTransactions(leagueId: string, week: number) {
  const validatedId = validateLeagueId(leagueId)
  const sanitizedWeek = sanitizeWeek(week)
  const { json, hash, url } = await fetchSleeper(`/league/${validatedId}/transactions/${sanitizedWeek}`)
  return { data: json, hash, url, fetchTime: new Date() }
}

export async function getDrafts(leagueId: string) {
  const validatedId = validateLeagueId(leagueId)
  const { json, hash, url } = await fetchSleeper(`/league/${validatedId}/drafts`)
  return { data: json, hash, url, fetchTime: new Date() }
}

export async function getStandingsData(leagueId: string) {
  try {
    const [usersResult, rostersResult] = await Promise.all([getUsers(leagueId), getRosters(leagueId)])

    const users = usersResult.data
    const rosters = rostersResult.data

    const standings = rosters
      .map((roster: any) => {
        const user = users.find((u: any) => u.user_id === roster.owner_id)

        const settings = roster.settings || {}
        const pointsFor =
          settings.fpts != null && settings.fpts_decimal != null ? settings.fpts + settings.fpts_decimal / 100 : 0

        const pointsAgainst =
          settings.fpts_against != null && settings.fpts_against_decimal != null
            ? settings.fpts_against + settings.fpts_against_decimal / 100
            : 0

        return {
          rosterId: roster.roster_id,
          teamName: user?.metadata?.team_name || user?.display_name || "Unknown Team",
          ownerName: user?.display_name || "Unknown Owner",
          wins: settings.wins || 0,
          losses: settings.losses || 0,
          ties: settings.ties || 0,
          pointsFor,
          pointsAgainst,
        }
      })
      .sort((a: any, b: any) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        return b.pointsFor - a.pointsFor
      })

    return {
      data: standings,
      provenance: {
        hash: usersResult.hash.slice(0, 8),
        fetchTime: usersResult.fetchTime,
        source: "sleeper",
      },
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("parse")) {
      throw new Error("Upstream data invalid - Sleeper API returned unexpected format")
    }
    throw error
  }
}

export async function getLatestWeekWithData(leagueId: string): Promise<number> {
  const validatedId = validateLeagueId(leagueId)

  // Calculate current NFL week based on 2025 season start
  const seasonStart = new Date("2025-09-04")
  const now = new Date()
  const daysSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24))
  const calculatedCurrentWeek = Math.max(1, Math.min(18, Math.floor(daysSinceStart / 7) + 1))

  for (let week = 1; week <= calculatedCurrentWeek; week++) {
    try {
      const matchupsResult = await getMatchups(validatedId, week)
      const matchups = matchupsResult.data

      if (!matchups || matchups.length === 0) continue

      const matchupsWithPoints = matchups.filter((m) => m.points && m.points > 0)
      if (matchupsWithPoints.length > 0) {
        return week
      }

      const matchupsWithStarters = matchups.filter((m) => m.starters && m.starters.length > 0)
      if (matchupsWithStarters.length > 0) {
        return week
      }
    } catch (error) {
      continue
    }
  }

  return calculatedCurrentWeek
}
