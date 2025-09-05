export interface SurvivorData {
  eliminatedUserIds?: string[]
  picksCSV?: string
}

export interface PickEmData {
  standingsCSV?: string
}

export const poolsConfig: Record<string, { survivor?: SurvivorData; pickem?: PickEmData }> = {
  "1261569839911153664": {
    // Survivor
    survivor: {
      eliminatedUserIds: [], // Add eliminated user IDs here when available
      picksCSV: undefined, // Add CSV URL here when available
    },
  },
  "1257745106425872384": {
    // Pick Em
    pickem: {
      standingsCSV: undefined, // Add CSV URL here when available
    },
  },
}
