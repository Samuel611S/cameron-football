export const siteConfig = {
  siteTitle: "Fantasy Football Hub",
  season: "2025",
  madeBy: "Sam's",
  constitutionMarkdownPath: "/content/constitution.md",
  resources: [
    { label: "DynastyFF Subreddit", url: "https://www.reddit.com/r/DynastyFF/" },
    { label: "FantasyPros", url: "https://www.fantasypros.com/nfl/" },
    { label: "KeepTradeCut", url: "https://keeptradecut.com/" },
  ],
  sleeper: {
    baseUrl: "https://api.sleeper.app/v1",
    endpoints: {
      league: (leagueId: string) => `/league/${leagueId}`,
      users: (leagueId: string) => `/league/${leagueId}/users`,
      rosters: (leagueId: string) => `/league/${leagueId}/rosters`,
      matchups: (leagueId: string, week: number) => `/league/${leagueId}/matchups/${week}`,
      transactions: (leagueId: string, week: number) => `/league/${leagueId}/transactions/${week}`,
      drafts: (leagueId: string) => `/league/${leagueId}/drafts`,
      draftPicks: (draftId: string) => `/draft/${draftId}/picks`,
    },
  },
} as const
