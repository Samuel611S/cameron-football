import { siteConfig } from "@/config/config"
import type { SleeperDraft, SleeperUser, SleeperRoster, SleeperMatchup, SleeperTransaction } from "@/types/sleeper"

const { sleeper } = siteConfig

// Types for Sleeper API responses
export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  status: string
  sport: string
  settings: {
    max_keepers: number
    draft_rounds: number
    trade_deadline: number
    playoff_week_start: number
    num_teams: number
    league_average_match: number
    playoff_round_type: number
    playoff_seed_type: number
    playoff_matchup_period_length: number
    playoff_type: number
    season_type: string
    waiver_type: number
    waiver_clear_days: number
    waiver_day_of_week: number
    start_week: number
    taxi_years: number
    taxi_allow_vets: number
    taxi_slots: number
    taxi_deadline: number
    reserve_allow_out: number
    reserve_slots: number
    reserve_allow_sus: number
    reserve_allow_cov: number
    reserve_allow_dnr: number
    reserve_allow_doubtful: number
    reserve_allow_na: number
    pick_trading: number
    disable_trades: number
    disable_adds: number
    max_adds: number
    waiver_budget: number
    bench_lock: number
  }
  scoring_settings: Record<string, number>
  roster_positions: string[]
  metadata: Record<string, any>
}

// Request deduplication cache to prevent duplicate API calls
const requestCache = new Map<string, Promise<any>>()

// Rate limiting queue to prevent too many simultaneous requests
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private lastRequestTime = 0
  private readonly minInterval = 50 // Reduced to 50ms for better performance

  async add<T>(requestFn: () => Promise<T>, cacheKey?: string): Promise<T> {
    if (cacheKey && requestCache.has(cacheKey)) {
      console.log("[v0] Using cached request:", cacheKey)
      return requestCache.get(cacheKey)!
    }

    const promise = new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      this.process()
    })

    if (cacheKey) {
      requestCache.set(cacheKey, promise)
      // Clear cache after 5 minutes
      setTimeout(() => requestCache.delete(cacheKey), 300000)
    }

    return promise
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime

      if (timeSinceLastRequest < this.minInterval) {
        await new Promise((resolve) => setTimeout(resolve, this.minInterval - timeSinceLastRequest))
      }

      const request = this.queue.shift()!
      this.lastRequestTime = Date.now()

      try {
        await request()
      } catch (error) {
        console.error("[v0] Request failed:", error)
      }
    }

    this.processing = false
  }
}

const requestQueue = new RequestQueue()

async function fetchSleeperAPI<T>(endpoint: string, retryCount = 0): Promise<T> {
  const url = `${sleeper.baseUrl}${endpoint}`
  const maxRetries = 3
  const baseDelay = 1000 // 1 second base delay
  const cacheKey = endpoint // Use endpoint as cache key

  return requestQueue.add(async () => {
    console.log("[v0] Fetching Sleeper API:", url)

    try {
      const response = await fetch(url, {
        next: { revalidate: 600 }, // 10 minutes ISR caching
      })

      if (!response.ok) {
        // Handle rate limiting specifically
        if (response.status === 429) {
          console.log("[v0] Rate limited, will retry after delay")
          if (retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount) // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay))
            return fetchSleeperAPI<T>(endpoint, retryCount + 1)
          }
          throw new Error(`Rate limited after ${maxRetries} retries`)
        }

        console.log("[v0] Sleeper API error:", response.status, response.statusText)
        throw new Error(`Sleeper API error: ${response.status} ${response.statusText}`)
      }

      const text = await response.text()

      // Check if response is HTML (rate limiting page) instead of JSON
      if (text.startsWith("<") || text.includes("Too Many Requests")) {
        console.log("[v0] Received HTML response (likely rate limited), will retry")
        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount)
          await new Promise((resolve) => setTimeout(resolve, delay))
          return fetchSleeperAPI<T>(endpoint, retryCount + 1)
        }
        throw new Error(`Rate limited - received HTML instead of JSON after ${maxRetries} retries`)
      }

      const data = JSON.parse(text)
      console.log("[v0] Sleeper API response received:", endpoint, data?.length || "single object")
      return data
    } catch (error) {
      if (error instanceof SyntaxError && error.message.includes("JSON")) {
        console.error("[v0] JSON parse error - likely rate limited:", error.message)
        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount)
          await new Promise((resolve) => setTimeout(resolve, delay))
          return fetchSleeperAPI<T>(endpoint, retryCount + 1)
        }
      }
      console.error("[v0] Sleeper API fetch failed:", error)
      throw error
    }
  }, cacheKey)
}

// League data fetchers
export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  return fetchSleeperAPI<SleeperLeague>(sleeper.endpoints.league(leagueId))
}

export async function getUsers(leagueId: string): Promise<SleeperUser[]> {
  return fetchSleeperAPI<SleeperUser[]>(sleeper.endpoints.users(leagueId))
}

export async function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  return fetchSleeperAPI<SleeperRoster[]>(sleeper.endpoints.rosters(leagueId))
}

export async function getMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
  return fetchSleeperAPI<SleeperMatchup[]>(sleeper.endpoints.matchups(leagueId, week))
}

export async function getTransactions(leagueId: string, week: number): Promise<SleeperTransaction[]> {
  return fetchSleeperAPI<SleeperTransaction[]>(sleeper.endpoints.transactions(leagueId, week))
}

export async function getDrafts(leagueId: string): Promise<SleeperDraft[]> {
  return fetchSleeperAPI<SleeperDraft[]>(sleeper.endpoints.drafts(leagueId))
}

export async function getDraft(draftId: string): Promise<SleeperDraft> {
  return fetchSleeperAPI<SleeperDraft>(`/draft/${draftId}`)
}

export async function getDraftPicks(draftId: string) {
  return fetchSleeperAPI<any[]>(sleeper.endpoints.draftPicks(draftId))
}

// Combined data fetchers for pages
export async function getStandingsData(leagueId: string) {
  const [users, rosters] = await Promise.all([getUsers(leagueId), getRosters(leagueId)])

  // Combine user and roster data for standings
  return rosters
    .map((roster) => {
      const user = users.find((u) => u.user_id === roster.owner_id)

      const pointsFor =
        roster.settings.fpts != null && roster.settings.fpts_decimal != null
          ? roster.settings.fpts + roster.settings.fpts_decimal / 100
          : 0

      const pointsAgainst =
        roster.settings.fpts_against != null && roster.settings.fpts_against_decimal != null
          ? roster.settings.fpts_against + roster.settings.fpts_against_decimal / 100
          : 0

      return {
        rosterId: roster.roster_id,
        teamName: user?.metadata?.team_name || user?.display_name || "Unknown Team",
        ownerName: user?.display_name || "Unknown Owner",
        wins: roster.settings.wins || 0,
        losses: roster.settings.losses || 0,
        ties: roster.settings.ties || 0,
        pointsFor,
        pointsAgainst,
      }
    })
    .sort((a, b) => {
      // Sort by wins first, then by points for
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })
}

export async function getManagersData(leagueId: string) {
  const users = await getUsers(leagueId)

  return users.map((user) => ({
    userId: user.user_id,
    username: user.username,
    displayName: user.display_name,
    avatar: user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
    teamName: user.metadata?.team_name,
  }))
}

export async function getDraftsData(leagueId: string) {
  const [drafts, users] = await Promise.all([getDrafts(leagueId), getUsers(leagueId)])

  return drafts.map((draft) => {
    // Convert draft order to array with user info
    const draftOrder = Object.entries(draft.draft_order || {})
      .map(([userId, pick]) => {
        const user = users.find((u) => u.user_id === userId)
        return {
          pick: pick as number,
          userId,
          displayName: user?.display_name || "Unknown",
          teamName: user?.metadata?.team_name,
          avatar: user?.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
        }
      })
      .sort((a, b) => a.pick - b.pick)

    return {
      ...draft,
      draftOrder,
      startTime: new Date(draft.start_time),
      created: new Date(draft.created),
      lastPicked: draft.last_picked ? new Date(draft.last_picked) : null,
    }
  })
}

export async function getMatchupsData(leagueId: string, week: number) {
  console.log(`[v0] Fetching matchups data for league ${leagueId}, week ${week}`)

  try {
    const [users, rosters, matchups] = await Promise.all([
      getUsers(leagueId),
      getRosters(leagueId),
      getMatchups(leagueId, week),
    ])

    console.log(`[v0] Retrieved ${users.length} users, ${rosters.length} rosters, ${matchups.length} matchups`)

    if (!matchups || matchups.length === 0) {
      console.log(`[v0] ERROR: No matchups found for week ${week}`)
      return {
        matchups: [],
        error: `No matchups found for week ${week}. This could mean:
        • The week hasn't started yet
        • The league hasn't been set up for this week
        • This is a special league type that doesn't use traditional matchups`,
        week,
        leagueId,
      }
    }

    // Check if matchups have meaningful data
    const matchupsWithPoints = matchups.filter((m) => m.points && m.points > 0)
    const matchupsWithStarters = matchups.filter((m) => m.starters && m.starters.length > 0)

    if (matchupsWithPoints.length === 0 && matchupsWithStarters.length === 0) {
      console.log(`[v0] WARNING: Matchups exist but no points or starters set`)
      return {
        matchups: [],
        error: `Week ${week} matchups exist but games haven't started yet:
        • ${matchups.length} matchup slots created
        • 0 teams have scored points
        • 0 teams have set starting lineups
        • This week may not have begun or lineups aren't locked`,
        week,
        leagueId,
      }
    }

    // Create roster lookup map
    const rosterMap = new Map(rosters.map((r) => [r.roster_id, r]))
    const userMap = new Map(users.map((u) => [u.user_id, u]))

    const projections = new Map<number, number>()
    const maxLookback = Math.min(2, week - 1)

    if (maxLookback > 0) {
      const pastWeeks = Array.from({ length: maxLookback }, (_, i) => week - 1 - i)
      const pastMatchupsPromises = pastWeeks.map((w) => getMatchups(leagueId, w).catch(() => []))
      const allPastMatchups = await Promise.all(pastMatchupsPromises)

      for (const roster of rosters) {
        let totalPoints = 0
        let weekCount = 0

        for (const pastMatchups of allPastMatchups) {
          const pastMatchup = pastMatchups.find((m) => m.roster_id === roster.roster_id)
          if (pastMatchup && pastMatchup.points > 0) {
            totalPoints += pastMatchup.points
            weekCount++
          }
        }

        const projection =
          weekCount > 0
            ? totalPoints / weekCount
            : (roster.settings.fpts + roster.settings.fpts_decimal / 100) /
              Math.max(1, roster.settings.wins + roster.settings.losses + roster.settings.ties)

        projections.set(roster.roster_id, projection || 100)
      }
    } else {
      for (const roster of rosters) {
        const projection =
          (roster.settings.fpts + roster.settings.fpts_decimal / 100) /
          Math.max(1, roster.settings.wins + roster.settings.losses + roster.settings.ties)
        projections.set(roster.roster_id, projection || 100)
      }
    }

    // Group matchups by matchup_id
    const matchupGroups = new Map<number, SleeperMatchup[]>()

    for (const matchup of matchups) {
      if (!matchupGroups.has(matchup.matchup_id)) {
        matchupGroups.set(matchup.matchup_id, [])
      }
      matchupGroups.get(matchup.matchup_id)!.push(matchup)
    }

    // Convert to matchup pairs
    const processedMatchups = Array.from(matchupGroups.entries())
      .map(([matchupId, teams]) => {
        const teamData = teams.map((team) => {
          const roster = rosterMap.get(team.roster_id)
          const user = roster ? userMap.get(roster.owner_id) : null
          const projection = projections.get(team.roster_id) || 100

          return {
            rosterId: team.roster_id,
            matchupId: team.matchup_id,
            points: team.points || null,
            projection,
            teamName: user?.metadata?.team_name || user?.display_name || "Unknown Team",
            ownerName: user?.display_name || "Unknown Owner",
            avatar: user?.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
            seed: rosters.findIndex((r) => r.roster_id === team.roster_id) + 1,
          }
        })

        // Calculate win probabilities
        if (teamData.length === 2) {
          const [teamA, teamB] = teamData
          const projDiff = (teamA.points || teamA.projection) - (teamB.points || teamB.projection)
          const winProbA = 1 / (1 + Math.exp(-projDiff / 25))
          const winProbB = 1 - winProbA

          teamA.winProbability = winProbA
          teamB.winProbability = winProbB
        }

        return {
          matchupId,
          teams: teamData,
        }
      })
      .sort((a, b) => a.matchupId - b.matchupId)

    console.log(`[v0] Successfully processed ${processedMatchups.length} matchups`)

    return {
      matchups: processedMatchups,
      error: null,
      week,
      leagueId,
      stats: {
        totalMatchups: matchups.length,
        matchupsWithPoints: matchupsWithPoints.length,
        matchupsWithStarters: matchupsWithStarters.length,
      },
    }
  } catch (error) {
    console.error(`[v0] Error fetching matchups data:`, error)
    return {
      matchups: [],
      error: `Failed to load matchups for week ${week}: ${error}`,
      week,
      leagueId,
    }
  }
}

export async function getLatestWeekWithData(leagueId: string): Promise<number> {
  console.log(`[v0] Fetching latest week data for league: ${leagueId}`)

  // Calculate current NFL week based on 2025 season start (September 4, 2025)
  const seasonStart = new Date("2025-09-04")
  const now = new Date()
  const daysSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24))
  const calculatedCurrentWeek = Math.max(1, Math.min(18, Math.floor(daysSinceStart / 7) + 1))

  console.log(`[v0] Calculated current NFL week: ${calculatedCurrentWeek}`)

  // Check weeks 1 through current week for actual game data
  for (let week = 1; week <= calculatedCurrentWeek; week++) {
    try {
      console.log(`[v0] Checking week ${week} for league ${leagueId}`)
      const matchups = await getMatchups(leagueId, week)

      if (!matchups || matchups.length === 0) {
        console.log(`[v0] Week ${week}: No matchups found`)
        continue
      }

      console.log(`[v0] Week ${week}: Found ${matchups.length} matchups`)

      // Check for actual game data (points scored)
      const matchupsWithPoints = matchups.filter((m) => m.points && m.points > 0)
      if (matchupsWithPoints.length > 0) {
        console.log(`[v0] Week ${week}: Found ${matchupsWithPoints.length} matchups with points - USING THIS WEEK`)
        return week
      }

      // Check for started lineups (players in starting positions)
      const matchupsWithStarters = matchups.filter((m) => m.starters && m.starters.length > 0)
      if (matchupsWithStarters.length > 0) {
        console.log(`[v0] Week ${week}: Found ${matchupsWithStarters.length} matchups with starters - USING THIS WEEK`)
        return week
      }

      console.log(`[v0] Week ${week}: Matchups exist but no points or starters - likely future week`)
    } catch (error) {
      console.log(`[v0] Week ${week}: API error - ${error}`)
      continue
    }
  }

  // If no weeks have game data, check if this is a special league type
  try {
    const league = await getLeague(leagueId)
    const leagueType = league.metadata?.league_type || "standard"

    console.log(`[v0] No weeks with game data found. League type: ${leagueType}`)

    if (leagueType === "survivor" || leagueType === "pick_em") {
      console.log(`[v0] Special league type detected - using week 1`)
      return 1
    }

    // For regular leagues, use current calculated week
    console.log(`[v0] Regular league - using calculated current week: ${calculatedCurrentWeek}`)
    return calculatedCurrentWeek
  } catch (error) {
    console.log(`[v0] Error fetching league info: ${error}`)
    console.log(`[v0] Defaulting to week 1`)
    return 1
  }
}
