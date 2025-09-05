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

            const [users, rosters, matchupsData] = await Promise.all([
              getUsers(currentLeague.leagueId),
              getRosters(currentLeague.leagueId),
              getMatchups(currentLeague.leagueId, latestWeek),
            ])

            const processed = processMatchupsForDisplay(matchupsData, users, rosters, latestWeek)
            setMatchups(processed)
            setRetryCount(0)
            break
          } catch (err) {
            lastError = err as Error
            attempt++
            if (attempt < maxRetries) {
              const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
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
            // Max 5 auto-retries
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
              {matchups.map((matchup) => (
                <div
                  key={matchup.matchupId}
                  className="w-full rounded-2xl border border-gray-700 bg-gray-800 shadow-sm p-4 md:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2 sm:gap-4">
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

                    <div className="flex items-center gap-2 sm:gap-4">
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

                  <div className="flex flex-wrap items-center justify-between gap-4">
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
                                width: `${
                                  ((team.points !== null ? team.points : team.projection) /
                                    Math.max(
                                      matchup.teams[0].points !== null
                                        ? matchup.teams[0].points
                                        : matchup.teams[0].projection,
                                      matchup.teams[1].points !== null
                                        ? matchup.teams[1].points
                                        : matchup.teams[1].projection,
                                    )) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {matchups.length === 0 && !error && (
              <div className="text-center py-16">
                <div className="text-6xl mb-6">📊</div>
                <p className="text-lg text-slate-400">No matchup data available for this week.</p>
                <p className="text-sm text-slate-500 mt-2">The display will automatically retry.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

function processMatchupsForDisplay(matchups: any[], users: any[], rosters: any[], week: number): ProcessedMatchup[] {
  const matchupGroups = new Map()

  matchups.forEach((matchup) => {
    const matchupId = matchup.matchup_id
    if (!matchupGroups.has(matchupId)) {
      matchupGroups.set(matchupId, [])
    }
    matchupGroups.get(matchupId).push(matchup)
  })

  return Array.from(matchupGroups.entries())
    .map(([matchupId, teams]) => {
      if (teams.length !== 2) return null

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

      return {
        matchupId,
        teams: processedTeams as [MatchupTeam, MatchupTeam],
      }
    })
    .filter(Boolean) as ProcessedMatchup[]
}

function calculateProjection(roster: any, allRosters: any[], currentWeek: number): number {
  const seasonAvg = roster?.settings?.fpts || 0
  return seasonAvg > 0 ? seasonAvg : 100
}
