import type { SleeperUser, SleeperRoster, SleeperMatchup } from "./sleeper"

export function mapManagers(users: SleeperUser[]): Record<string, SleeperUser> {
  return users.reduce(
    (acc, user) => {
      acc[user.user_id] = user
      return acc
    },
    {} as Record<string, SleeperUser>,
  )
}

export function avatarUrl(avatarId: string | null): string {
  if (!avatarId) return "/diverse-user-avatars.png"
  return `https://sleepercdn.com/avatars/thumbs/${avatarId}`
}

export async function collectWeeks(leagueId: string): Promise<number[]> {
  const { getMatchups } = await import("./sleeper")
  const weeks: number[] = []

  for (let week = 1; week <= 18; week++) {
    try {
      const matchups = await getMatchups(leagueId, week)
      if (matchups.length === 0) break
      weeks.push(week)
    } catch (error) {
      break
    }
  }

  return weeks
}

export function sumPFByRoster(matchupsByWeek: Record<number, SleeperMatchup[]>): Record<number, number> {
  const pfByRoster: Record<number, number> = {}

  Object.values(matchupsByWeek).forEach((weekMatchups) => {
    weekMatchups.forEach((matchup) => {
      if (!pfByRoster[matchup.roster_id]) {
        pfByRoster[matchup.roster_id] = 0
      }
      pfByRoster[matchup.roster_id] += matchup.points || 0
    })
  })

  return pfByRoster
}

export function computeStandings(
  rosters: SleeperRoster[],
  matchupsByWeek: Record<number, SleeperMatchup[]>,
): Array<{
  rosterId: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
}> {
  const pfByRoster = sumPFByRoster(matchupsByWeek)

  // Calculate PA by finding opponent scores
  const paByRoster: Record<number, number> = {}

  Object.values(matchupsByWeek).forEach((weekMatchups) => {
    const matchupGroups: Record<number, SleeperMatchup[]> = {}

    // Group by matchup_id
    weekMatchups.forEach((matchup) => {
      if (!matchupGroups[matchup.matchup_id]) {
        matchupGroups[matchup.matchup_id] = []
      }
      matchupGroups[matchup.matchup_id].push(matchup)
    })

    // Calculate PA for each matchup
    Object.values(matchupGroups).forEach((matchupPair) => {
      if (matchupPair.length === 2) {
        const [team1, team2] = matchupPair

        if (!paByRoster[team1.roster_id]) paByRoster[team1.roster_id] = 0
        if (!paByRoster[team2.roster_id]) paByRoster[team2.roster_id] = 0

        paByRoster[team1.roster_id] += team2.points || 0
        paByRoster[team2.roster_id] += team1.points || 0
      }
    })
  })

  return rosters
    .map((roster) => ({
      rosterId: roster.roster_id,
      wins: roster.settings.wins || 0,
      losses: roster.settings.losses || 0,
      ties: roster.settings.ties || 0,
      pointsFor: pfByRoster[roster.roster_id] || 0,
      pointsAgainst: paByRoster[roster.roster_id] || 0,
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })
}
