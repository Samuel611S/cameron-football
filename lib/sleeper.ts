import { config } from "@/config/config"

const { sleeper } = config.resources

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

export interface SleeperUser {
  user_id: string
  username: string
  display_name: string
  avatar: string
  metadata: {
    team_name?: string
  }
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string
  players: string[]
  starters: string[]
  reserve: string[]
  taxi: string[]
  settings: {
    wins: number
    waiver_position: number
    waiver_budget_used: number
    total_moves: number
    ties: number
    losses: number
    fpts: number
    fpts_decimal: number
    fpts_against: number
    fpts_against_decimal: number
  }
  metadata: Record<string, any>
}

export interface SleeperDraft {
  draft_id: string
  created: number
  last_picked: number
  type: string
  status: string
  start_time: number
  sport: string
  settings: {
    teams: number
    alpha_sort: number
    reversal_round: number
    enforce_position_limits: number
    nomination_timer: number
    pick_timer: number
    autostart: number
    cpu_autopick: number
    player_type: number
    position_limit_qb: number
    position_limit_rb: number
    position_limit_wr: number
    position_limit_te: number
    position_limit_k: number
    position_limit_def: number
    position_limit_dl: number
    position_limit_lb: number
    position_limit_db: number
    rounds: number
  }
  season: string
  season_type: string
  league_id: string
  metadata: Record<string, any>
  draft_order: Record<string, number>
}

// API fetcher with ISR caching
async function fetchSleeperAPI<T>(endpoint: string): Promise<T> {
  const url = `${sleeper.baseUrl}${endpoint}`

  const response = await fetch(url, {
    next: { revalidate: 600 }, // 10 minutes ISR caching
  })

  if (!response.ok) {
    throw new Error(`Sleeper API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// League data fetchers
export async function getLeague(): Promise<SleeperLeague> {
  return fetchSleeperAPI<SleeperLeague>(sleeper.endpoints.league(config.leagueId))
}

export async function getUsers(): Promise<SleeperUser[]> {
  return fetchSleeperAPI<SleeperUser[]>(sleeper.endpoints.users(config.leagueId))
}

export async function getRosters(): Promise<SleeperRoster[]> {
  return fetchSleeperAPI<SleeperRoster[]>(sleeper.endpoints.rosters(config.leagueId))
}

export async function getDrafts(): Promise<SleeperDraft[]> {
  return fetchSleeperAPI<SleeperDraft[]>(sleeper.endpoints.drafts(config.leagueId))
}

// Draft picks fetcher
export async function getDraftPicks(draftId: string) {
  return fetchSleeperAPI<any[]>(sleeper.endpoints.draftPicks(draftId))
}

// Combined data fetchers for pages
export async function getStandingsData() {
  const [users, rosters] = await Promise.all([getUsers(), getRosters()])

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

export async function getManagersData() {
  const users = await getUsers()

  return users.map((user) => ({
    userId: user.user_id,
    username: user.username,
    displayName: user.display_name,
    avatar: user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
    teamName: user.metadata?.team_name,
  }))
}

export async function getDraftsData() {
  const [drafts, users] = await Promise.all([getDrafts(), getUsers()])

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
