export interface SleeperUser {
  user_id: string
  username: string
  display_name: string
  avatar: string | null
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string
  league_id: string
  players: string[] | null
  starters: string[] | null
  reserve: string[] | null
  taxi: string[] | null
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
  metadata?: {
    streak?: string
    record?: string
  }
}

export interface SleeperDraft {
  draft_id: string
  created: number
  draft_order: Record<string, number> | null
  league_id: string
  metadata: {
    scoring_type: string
    name: string
    description: string
  }
  season: string
  season_type: string
  settings: {
    teams: number
    alpha_sort: number
    reversal_round: number
    enforce_position_limits: number
    nomination_timer: number
    pick_timer: number
    budget: number
    cpu_autopick: number
  }
  sport: string
  start_time: number
  status: string
  type: number
  slot_to_roster_id: Record<string, number>
}

export interface SleeperMatchup {
  roster_id: number
  matchup_id: number
  points: number
  players_points: Record<string, number>
  starters: string[]
  starters_points: number[]
  players: string[]
  custom_points: number | null
}

export interface SleeperTransaction {
  transaction_id: string
  type: "trade" | "waiver" | "free_agent"
  status: string
  created: number
  roster_ids: number[]
  adds: Record<string, number> | null
  drops: Record<string, number> | null
  draft_picks: any[]
  waiver_budget: any[]
  settings: {
    waiver_bid?: number
  } | null
  metadata: any
  leg: number
}
