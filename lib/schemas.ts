import { z } from "zod"

export const SleeperLeagueSchema = z.object({
  league_id: z.string(),
  name: z.string(),
  season: z.string(),
  status: z.string(),
  sport: z.string(),
  settings: z
    .object({
      num_teams: z.number(),
      playoff_week_start: z.number().optional(),
      start_week: z.number().optional(),
    })
    .passthrough(),
  scoring_settings: z.record(z.number()).optional(),
  roster_positions: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
})

export const SleeperUserSchema = z.object({
  user_id: z.string(),
  username: z.string().optional(),
  display_name: z.string().optional(),
  avatar: z.string().optional(),
  metadata: z
    .object({
      team_name: z.string().optional(),
    })
    .optional(),
})

export const SleeperRosterSchema = z.object({
  roster_id: z.number(),
  owner_id: z.string(),
  settings: z
    .union([
      z
        .object({
          wins: z.number().optional(),
          losses: z.number().optional(),
          ties: z.number().optional(),
          fpts: z.number().optional(),
          fpts_decimal: z.number().optional(),
          fpts_against: z.number().optional(),
          fpts_against_decimal: z.number().optional(),
        })
        .passthrough(),
      z.null(),
    ])
    .optional(),
})

export const SleeperMatchupSchema = z.object({
  roster_id: z.number(),
  matchup_id: z.number(),
  points: z.number().nullable().default(0),
  starters: z.array(z.string()).optional(),
  players: z.array(z.string()).optional(),
  players_points: z.record(z.string(), z.number()).optional(),
  custom_points: z.number().optional().nullable(),
  settings: z.record(z.any()).nullable().optional(), // Allow null/missing settings
})

export const SleeperTransactionSchema = z.object({
  transaction_id: z.string(),
  type: z.string(),
  status: z.string(),
  created: z.number(),
  roster_ids: z.array(z.number()),
  adds: z.record(z.number()).optional(),
  drops: z.record(z.number()).optional(),
  waiver_budget: z
    .array(
      z.object({
        sender: z.number(),
        receiver: z.number(),
        amount: z.number(),
      }),
    )
    .optional(),
})

export const SleeperDraftSchema = z.object({
  draft_id: z.string(),
  type: z.string(),
  status: z.string(),
  start_time: z.number(),
  created: z.number(),
  last_picked: z.number().optional(),
  draft_order: z.record(z.number()).optional(),
  settings: z
    .object({
      teams: z.number(),
      rounds: z.number(),
    })
    .passthrough(),
})
