export const config = {
  leagueId: "1267631943646707712",
  season: "2024",
  siteTitle: "Fantasy Football League",
  resources: {
    sleeper: {
      baseUrl: "https://api.sleeper.app/v1",
      endpoints: {
        league: (leagueId: string) => `/league/${leagueId}`,
        users: (leagueId: string) => `/league/${leagueId}/users`,
        rosters: (leagueId: string) => `/league/${leagueId}/rosters`,
        matchups: (leagueId: string, week: number) => `/league/${leagueId}/matchups/${week}`,
        drafts: (leagueId: string) => `/league/${leagueId}/drafts`,
        draftPicks: (draftId: string) => `/draft/${draftId}/picks`,
      },
    },
  },
} as const
