"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { leagues } from "@/config/leagues"
import { siteConfig } from "@/config/config"
import { getUsers, getRosters, getMatchups, getLatestWeekWithData } from "@/lib/sleeper"
import { avatarUrl } from "@/lib/helpers"

interface MatchupTeam {
  rosterId: number
  teamName: string
  ownerName: string
  handle: string
  avatar: string | null
  seed: string
  points: number | null
  projection: number
  winProbability: number
}

interface ProcessedMatchup {
  matchupId: number
  teams: [MatchupTeam, MatchupTeam]
}

function ErrorBoundary({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleError = () => setHasError(true)
    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleError)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleError)
    }
  }, [])

  if (hasError) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

const LEAGUE_FORMAT: Record<string, "h2h" | "guillotine" | "survivor" | "pickem"> = {
  "1269339474479824896": "guillotine",
  "1269338777323581440": "guillotine",
  "1269338223918714880": "guillotine",
  "1261569839911153664": "survivor",
  "1257745106425872384": "pickem",
  "1267607910209306624": "h2h",
  "1267631483950989312": "h2h",
  "1267631730034999296": "h2h",
}

export default function HomePage() {
  const [currentLeagueIndex, setCurrentLeagueIndex] = useState(0)
  const [currentWeek, setCurrentWeek] = useState<number>(1)
  const [matchups, setMatchups] = useState<ProcessedMatchup[]>([])
  const [loading, setLoading] = useState(true)
  const [fadeClass, setFadeClass] = useState("opacity-100")
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const currentLeague = leagues[currentLeagueIndex]

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeClass("opacity-0")
      setLoading(true)
      setTimeout(() => {
        setCurrentLeagueIndex((prev) => (prev + 1) % leagues.length)
        setFadeClass("opacity-100")
      }, 300)
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function fetchMatchupData() {
      if (!currentLeague) return

      setLoading(true)
      setError(null)

      try {
        console.log("[v0] Fetching latest week data for", currentLeague.name)

        const maxRetries = 3
        let attempt = 0
        let lastError: Error | null = null

        while (attempt < maxRetries) {
          try {
            const latestWeek = await getLatestWeekWithData(currentLeague.leagueId)
            console.log("[v0] Latest week detected:", latestWeek)
            setCurrentWeek(latestWeek)

            const format = LEAGUE_FORMAT[currentLeague.leagueId] || "h2h"

            if (format === "guillotine") {
              // For Guillotine leagues, focus on standings/total points rather than matchups
              const [users, rosters, matchupsData] = await Promise.all([
                getUsers(currentLeague.leagueId),
                getRosters(currentLeague.leagueId),
                getMatchups(currentLeague.leagueId, latestWeek),
              ])

              // Process as Guillotine standings table instead of matchups
              const processed = processGuillotineStandings(matchupsData, users, rosters, latestWeek)
              setMatchups(processed)
              // Store the actual data for the component
              ;(window as any).guillotineData = { users, rosters }
            } else {
              // Traditional H2H or other formats
              const [users, rosters, matchupsData] = await Promise.all([
                getUsers(currentLeague.leagueId),
                getRosters(currentLeague.leagueId),
                getMatchups(currentLeague.leagueId, latestWeek),
              ])

              const processed = processMatchupsForDisplay(matchupsData, users, rosters, latestWeek)
              setMatchups(processed)
            }

            setRetryCount(0)
            break
          } catch (err) {
            lastError = err as Error
            attempt++
            if (attempt < maxRetries) {
              const delay = Math.pow(2, attempt) * 1000
              console.log(`[v0] Attempt ${attempt} failed, retrying in ${delay}ms...`)
              await new Promise((resolve) => setTimeout(resolve, delay))
            }
          }
        }

        if (attempt === maxRetries && lastError) {
          throw lastError
        }
      } catch (error) {
        console.error("[v0] Failed to fetch matchup data:", error)
        setError(`Failed to load data for ${currentLeague.name}`)
        setMatchups([])
        setRetryCount((prev) => prev + 1)

        setTimeout(() => {
          if (retryCount < 5) {
            fetchMatchupData()
          }
        }, 30000)
      } finally {
        setLoading(false)
      }
    }

    fetchMatchupData()

    const refreshInterval = setInterval(fetchMatchupData, 5 * 60 * 1000)
    return () => clearInterval(refreshInterval)
  }, [currentLeague, retryCount])

  const errorFallback = (
    <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6 text-center">
      <div className="text-6xl">⚠️</div>
      <h1 className="text-4xl font-bold text-red-400">Connection Issue</h1>
      <p className="text-xl text-muted-foreground max-w-md">
        {error || "Something went wrong. The display will automatically retry."}
      </p>
      <div className="text-sm text-muted-foreground">Retry attempt: {retryCount}/5 • Auto-retry in 30 seconds</div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-[100svh] w-full flex flex-col items-center justify-center bg-black text-slate-100">
        <div className="max-w-[500px] sm:max-w-[600px] md:max-w-[900px] mx-auto px-3 sm:px-4 py-4">
          <div className="text-center space-y-6">
            <div className="relative">
              <h1 className="text-[clamp(1.5rem,4vw,3rem)] font-bold text-balance animate-pulse">
                {currentLeague?.name || "Fantasy Football Hub"}
              </h1>
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
            </div>
            <p className="text-[clamp(1rem,2.5vw,1.5rem)] text-slate-400 animate-pulse">
              Loading {siteConfig.season} season matchups...
            </p>
          </div>

          <div className="relative flex justify-center mt-8">
            <div className="w-24 h-24 border-6 border-black rounded-full animate-spin">
              <div className="absolute top-0 left-0 w-24 h-24 border-6 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          </div>

          <div className="flex justify-center space-x-3 mt-8">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>

          <div className="w-full max-w-80 mx-auto h-3 bg-black rounded-full overflow-hidden mt-8 border border-slate-700">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary fallback={errorFallback}>
      <div className="min-h-[100svh] w-full flex flex-col items-center justify-start bg-black text-slate-100">
        <div className="max-w-[500px] sm:max-w-[600px] md:max-w-[900px] mx-auto px-3 sm:px-4 py-4 w-full">
          <div className={`space-y-6 transition-opacity duration-300 ${fadeClass}`}>
            <div className="text-center space-y-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-balance leading-tight">
                {currentLeague.name} — Week {currentWeek} Matchups
              </h1>
              <p className="text-base sm:text-lg text-slate-400">
                {siteConfig.season} Season • {currentLeague.type} League
              </p>
              <p className="text-sm text-slate-500">Auto-updating every 5 minutes • Week detection: automatic</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {matchups.length > 0
                ? (() => {
                    const format = LEAGUE_FORMAT[currentLeague.leagueId] || "h2h"

                    if (format === "guillotine") {
                      const guillotineData = (window as any).guillotineData || { users: [], rosters: [] }
                      return (
                        <div className="lg:col-span-2">
                          <GuillotineTable
                            matchups={matchups.map((m) => ({
                              roster_id: m.teams[0].rosterId,
                              points: m.teams[0].points || m.teams[0].projection,
                            }))}
                            users={guillotineData.users}
                            rosters={guillotineData.rosters}
                          />
                        </div>
                      )
                    }

                    // Traditional H2H matchup cards
                    return matchups.map((matchup) => (
                      <div
                        key={matchup.matchupId}
                        className="w-full rounded-2xl border border-gray-700 bg-gray-800 shadow-sm p-4 md:p-6"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  matchup.teams[0].winProbability >= 0.5
                                    ? "bg-green-600/30 text-green-300 border border-green-500/50"
                                    : "bg-red-600/30 text-red-300 border border-red-500/50"
                                }`}
                              >
                                WIN {Math.round(matchup.teams[0].winProbability * 100)}%
                              </span>
                              <span className="text-xl sm:text-2xl font-bold">
                                {matchup.teams[0].points !== null
                                  ? matchup.teams[0].points.toFixed(1)
                                  : matchup.teams[0].projection.toFixed(1)}
                              </span>
                            </div>

                            <div className="px-3 py-1 rounded-full bg-gray-700 text-sm font-bold border border-gray-600">
                              VS
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xl sm:text-2xl font-bold">
                                {matchup.teams[1].points !== null
                                  ? matchup.teams[1].points.toFixed(1)
                                  : matchup.teams[1].projection.toFixed(1)}
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  matchup.teams[1].winProbability >= 0.5
                                    ? "bg-green-600/30 text-green-300 border border-green-500/50"
                                    : "bg-red-600/30 text-red-300 border border-red-500/50"
                                }`}
                              >
                                WIN {Math.round(matchup.teams[1].winProbability * 100)}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            {matchup.teams.map((team, index) => (
                              <div key={team.rosterId} className="flex items-center gap-3 flex-1 min-w-0">
                                {team.avatar ? (
                                  <img
                                    src={team.avatar || "/placeholder.svg"}
                                    alt={team.ownerName}
                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-black shadow-lg flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black border-2 border-black flex items-center justify-center shadow-lg flex-shrink-0">
                                    <span className="text-xs font-bold text-slate-300">
                                      {team.ownerName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm sm:text-base truncate">{team.ownerName}</div>
                                  <div className="text-xs sm:text-sm text-slate-400 truncate">
                                    @{team.handle} {team.seed}
                                  </div>

                                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden border border-gray-600 w-full">
                                    <div
                                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000 shadow-inner"
                                      style={{
                                        width: `${Math.min(100, Math.max(0, team.winProbability * 100))}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  })()
                : (() => {
                    const format = LEAGUE_FORMAT[currentLeague.leagueId] || "h2h"

                    if (format === "survivor") {
                      return <SurvivorBoard leagueId={currentLeague.leagueId} users={[]} />
                    } else if (format === "pickem") {
                      return <PickEmLeaderboard leagueId={currentLeague.leagueId} users={[]} />
                    } else if (format === "guillotine") {
                      return (
                        <div className="w-full rounded-2xl border border-gray-700 bg-gray-800 shadow-sm p-4 md:p-6">
                          <div className="text-center py-8">
                            <div className="text-4xl mb-4">⚔️</div>
                            <p className="text-lg text-slate-400">Guillotine League</p>
                            <p className="text-sm text-slate-500 mt-2">Loading standings data...</p>
                          </div>
                        </div>
                      )
                    } else {
                      return (
                        <div className="w-full rounded-2xl border border-gray-700 bg-gray-800 shadow-sm p-4 md:p-6">
                          <div className="text-center py-8">
                            <div className="text-4xl mb-4">📊</div>
                            <p className="text-lg text-slate-400">No matchup data available for this week.</p>
                            <p className="text-sm text-slate-500 mt-2">The display will automatically retry.</p>
                          </div>
                        </div>
                      )
                    }
                  })()}
            </div>

            {matchups.length === 0 && !error && (
              <div className="text-center py-16">
                <div className="text-6xl mb-6">📊</div>
                <p className="text-lg text-slate-400">No matchup data available for this week.</p>
                <p className="text-sm text-slate-500 mt-2">
                  {currentLeague.name.toLowerCase().includes("pick") ||
                  currentLeague.name.toLowerCase().includes("survivor")
                    ? "This league uses NFL Pick'em/Survivor format which doesn't have traditional fantasy matchups."
                    : "The display will automatically retry."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

function SurvivorBoard({ leagueId, users }: { leagueId: string; users: any[] }) {
  return (
    <div className="w-full rounded-2xl border border-gray-700 bg-gray-800 shadow-sm p-4 md:p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-green-400">Alive Players</h3>
          <p className="text-sm text-slate-400 mt-1">Still in the game</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {users.slice(0, 20).map((user, index) => (
            <div
              key={user.user_id}
              className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-gray-700 border border-gray-600"
            >
              {user.avatar ? (
                <img
                  src={avatarUrl(user.avatar) || "/placeholder.svg"}
                  alt={user.display_name}
                  className="w-8 h-8 rounded-full border-2 border-green-500"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-green-600 border-2 border-green-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {user.display_name?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
              )}
              <span className="text-xs font-medium text-center truncate w-full">{user.display_name || "Unknown"}</span>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-slate-500 bg-gray-700 rounded-lg p-3 border border-gray-600">
          Picks not available via public API; showing alive status only.
        </div>
      </div>
    </div>
  )
}

function PickEmLeaderboard({ leagueId, users }: { leagueId: string; users: any[] }) {
  return (
    <div className="w-full rounded-2xl border border-gray-700 bg-gray-800 shadow-sm p-4 md:p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-blue-400">Pick'em Leaderboard</h3>
          <p className="text-sm text-slate-400 mt-1">Season standings</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-2 text-slate-300">Rank</th>
                <th className="text-left py-2 text-slate-300">Manager</th>
                <th className="text-center py-2 text-slate-300">Week</th>
                <th className="text-center py-2 text-slate-300">Season</th>
                <th className="text-center py-2 text-slate-300">Win%</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 10).map((user, index) => (
                <tr key={user.user_id} className="border-b border-gray-700">
                  <td className="py-2 font-bold text-slate-200">#{index + 1}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {user.avatar ? (
                        <img
                          src={avatarUrl(user.avatar) || "/placeholder.svg"}
                          alt={user.display_name}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {user.display_name?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                      )}
                      <span className="font-medium">{user.display_name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="py-2 text-center tabular-nums text-slate-300">--/--</td>
                  <td className="py-2 text-center tabular-nums text-slate-300">--/--</td>
                  <td className="py-2 text-center tabular-nums text-slate-300">--%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center text-sm text-slate-500 bg-gray-700 rounded-lg p-3 border border-gray-600">
          Standings will appear once picks are recorded.
        </div>
      </div>
    </div>
  )
}

function GuillotineTable({ matchups, users, rosters }: { matchups: any[]; users: any[]; rosters: any[] }) {
  console.log("[v0] GuillotineTable received:", {
    matchupsCount: matchups.length,
    usersCount: users.length,
    rostersCount: rosters.length,
  })

  const teamScores = matchups
    .map((matchup) => {
      const roster = rosters.find((r) => r.roster_id === matchup.roster_id)
      const user = users.find((u) => u.user_id === roster?.owner_id)

      console.log("[v0] Processing team:", {
        rosterId: matchup.roster_id,
        rosterFound: !!roster,
        userFound: !!user,
        ownerName: user?.display_name,
        userId: user?.user_id,
        rosterOwnerId: roster?.owner_id,
      })

      return {
        rosterId: matchup.roster_id,
        ownerName: user?.display_name || "Unknown",
        avatar: avatarUrl(user?.avatar),
        points: matchup.points || 0,
      }
    })
    .sort((a, b) => b.points - a.points)

  const lowestScore = Math.min(...teamScores.map((t) => t.points))

  return (
    <div className="w-full rounded-2xl border border-gray-700 bg-gray-800 shadow-sm p-4 md:p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-red-400">Guillotine Leaderboard</h3>
          <p className="text-sm text-slate-400 mt-1">Lowest scorer gets eliminated</p>
        </div>

        <div className="space-y-2">
          {teamScores.map((team, index) => {
            const isChopZone = team.points === lowestScore && team.points > 0

            return (
              <div
                key={team.rosterId}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isChopZone ? "bg-red-900/30 border-red-500/50 ring-1 ring-red-500/30" : "bg-gray-700 border-gray-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 text-center font-bold ${isChopZone ? "text-red-300" : "text-slate-300"}`}>
                    #{index + 1}
                  </span>
                  {team.avatar ? (
                    <img
                      src={team.avatar || "/placeholder.svg"}
                      alt={team.ownerName}
                      className={`w-8 h-8 rounded-full border-2 ${isChopZone ? "border-red-500" : "border-gray-500"}`}
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                        isChopZone ? "bg-red-600 border-red-500" : "bg-gray-600 border-gray-500"
                      }`}
                    >
                      <span className="text-xs font-bold text-white">{team.ownerName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span className={`font-medium ${isChopZone ? "text-red-200" : "text-slate-200"}`}>
                    {team.ownerName}
                  </span>
                  {isChopZone && (
                    <span className="px-2 py-1 text-xs font-bold bg-red-600 text-red-100 rounded-full">CHOP ZONE</span>
                  )}
                </div>
                <span className={`text-lg font-bold tabular-nums ${isChopZone ? "text-red-300" : "text-slate-200"}`}>
                  {team.points.toFixed(1)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function processGuillotineStandings(matchups: any[], users: any[], rosters: any[], week: number): ProcessedMatchup[] {
  if (!Array.isArray(matchups)) {
    console.log("[v0] Non-array matchups detected for Guillotine league")
    return []
  }

  // For Guillotine, create individual team standings sorted by points
  const teamStandings = matchups
    .map((matchup) => {
      const roster = rosters.find((r) => r.roster_id === matchup.roster_id)
      const user = users.find((u) => u.user_id === roster?.owner_id)

      const points = matchup.points || null
      const projection = calculateProjection(roster, rosters, week)

      return {
        rosterId: matchup.roster_id,
        teamName: user?.metadata?.team_name || `Team ${matchup.roster_id}`,
        ownerName: user?.display_name || "Unknown",
        handle: user?.metadata?.username || user?.display_name?.toLowerCase().replace(/\s+/g, "") || "unknown",
        avatar: avatarUrl(user?.avatar),
        seed: `(#${roster?.settings?.rank || "—"})`,
        points,
        projection,
        winProbability: 0.5,
      }
    })
    .sort((a, b) => {
      const scoreA = a.points !== null ? a.points : a.projection
      const scoreB = b.points !== null ? b.points : b.projection
      return scoreB - scoreA // Highest to lowest
    })

  // Convert to matchup format for display compatibility
  return teamStandings.map((team, index) => ({
    matchupId: team.rosterId,
    teams: [
      team,
      {
        rosterId: 999 + index,
        teamName: `Rank #${index + 1}`,
        ownerName: `Position ${index + 1}`,
        handle: "rank",
        avatar: null,
        seed: "",
        points: null,
        projection: 0,
        winProbability: 0,
      },
    ] as [MatchupTeam, MatchupTeam],
  }))
}

function processMatchupsForDisplay(matchups: any[], users: any[], rosters: any[], week: number): ProcessedMatchup[] {
  if (!Array.isArray(matchups)) {
    console.log("[v0] Non-array matchups detected - likely Pick Em or Survivor league")
    return []
  }

  const matchupGroups = new Map()

  matchups.forEach((matchup) => {
    const matchupId = matchup.matchup_id
    if (!matchupGroups.has(matchupId)) {
      matchupGroups.set(matchupId, [])
    }
    matchupGroups.get(matchupId).push(matchup)
  })

  const processedMatchups: ProcessedMatchup[] = []

  Array.from(matchupGroups.entries()).forEach(([matchupId, teams]) => {
    if (teams.length === 2) {
      // Traditional H2H matchup
      const processedTeams = teams.map((team: any) => {
        const roster = rosters.find((r) => r.roster_id === team.roster_id)
        const user = users.find((u) => u.user_id === roster?.owner_id)

        const points = team.points || null
        const projection = calculateProjection(roster, rosters, week)

        return {
          rosterId: team.roster_id,
          teamName: user?.metadata?.team_name || `Team ${team.roster_id}`,
          ownerName: user?.display_name || "Unknown",
          handle: user?.metadata?.username || user?.display_name?.toLowerCase().replace(/\s+/g, "") || "unknown",
          avatar: avatarUrl(user?.avatar),
          seed: `(#${roster?.settings?.rank || "—"})`,
          points,
          projection,
          winProbability: 0,
        }
      })

      const projA = processedTeams[0].points !== null ? processedTeams[0].points : processedTeams[0].projection
      const projB = processedTeams[1].points !== null ? processedTeams[1].points : processedTeams[1].projection

      processedTeams[0].winProbability = 1 / (1 + Math.exp(-(projA - projB) / 25))
      processedTeams[1].winProbability = 1 - processedTeams[0].winProbability

      processedMatchups.push({
        matchupId,
        teams: processedTeams as [MatchupTeam, MatchupTeam],
      })
    } else if (teams.length === 1) {
      // Guillotine-style individual team vs league average
      const team = teams[0]
      const roster = rosters.find((r) => r.roster_id === team.roster_id)
      const user = users.find((u) => u.user_id === roster?.owner_id)

      const points = team.points || null
      const projection = calculateProjection(roster, rosters, week)

      const allMatchupPoints = matchups.map((m) => m.points).filter((p) => p !== null && p !== undefined && p > 0)

      const leagueAverage =
        allMatchupPoints.length > 0
          ? allMatchupPoints.reduce((sum, points) => sum + points, 0) / allMatchupPoints.length
          : 120

      console.log(
        "[v0] League average calculated:",
        leagueAverage,
        "from",
        allMatchupPoints.length,
        "teams with points",
      )

      const teamData = {
        rosterId: team.roster_id,
        teamName: user?.metadata?.team_name || `Team ${team.roster_id}`,
        ownerName: user?.display_name || "Unknown",
        handle: user?.metadata?.username || user?.display_name?.toLowerCase().replace(/\s+/g, "") || "unknown",
        avatar: avatarUrl(user?.avatar),
        seed: `(#${roster?.settings?.rank || "—"})`,
        points,
        projection,
        winProbability: 0.5,
      }

      const leagueData = {
        rosterId: 999,
        teamName: "League Average",
        ownerName: "League Avg",
        handle: "league",
        avatar: null,
        seed: "",
        points: null,
        projection: leagueAverage,
        winProbability: 0.5,
      }

      const teamScore = teamData.points !== null ? teamData.points : teamData.projection
      teamData.winProbability = 1 / (1 + Math.exp(-(teamScore - leagueAverage) / 25))
      leagueData.winProbability = 1 - teamData.winProbability

      processedMatchups.push({
        matchupId: team.roster_id,
        teams: [teamData, leagueData] as [MatchupTeam, MatchupTeam],
      })
    }
  })

  return processedMatchups
}

function calculateProjection(roster: any, allRosters: any[], currentWeek: number): number {
  const seasonAvg = roster?.settings?.fpts || roster?.settings?.fpts_decimal || 0
  return seasonAvg > 0 ? seasonAvg : 120
}
