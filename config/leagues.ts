export const leagues = [
  { key: "guillotine-1", name: "Guillotine 1", type: "Guillotine", leagueId: "1269339474479824896" },
  { key: "guillotine-2", name: "Guillotine 2", type: "Guillotine", leagueId: "1269338777323581440" },
  { key: "guillotine-3", name: "Guillotine 3", type: "Guillotine", leagueId: "1269338223918714880" },
  { key: "ppr-1", name: "PPR 1", type: "PPR", leagueId: "1267607910209306624" },
  { key: "ppr-2", name: "PPR 2", type: "PPR", leagueId: "1267631483950989312" },
  { key: "ppr-3", name: "PPR 3", type: "PPR", leagueId: "1267631730034999296" },
  { key: "survivor", name: "Survivor", type: "Survivor", leagueId: "1261569839911153664" },
  { key: "pick-em", name: "Pick Em", type: "Pick Em", leagueId: "1257745106425872384" },
]

export function byKey(key: string) {
  return leagues.find((l) => l.key === key)
}

export type League = (typeof leagues)[0]
