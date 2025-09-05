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
  points: number | null // Allow null for pre-game state
  projection: number
  winProbability: number | null // Allow null when no probability should be shown
  isPreGame: boolean // Track pre-game state
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

const LEAGUE_FORMAT: Record<string, "h2h" | "guillotine"> = {
  "1269339474479824896": "guillotine", // Guillotine 1
  "1269338777323581440": "guillotine", // Guillotine 2
  "1269338223918714880": "guillotine", // Guillotine 3
  "1267607910209306624": "h2h", // PPR 1
  "1267631483950989312": "h2h", // PPR 2
  "1267631730034999296": "h2h", // PPR 3
}

export default function HomePage() {
  const [currentLeagueIndex, setCurrentLeagueIndex] = useState(0)
  const [currentWeek, setCurrentWeek] = useState<number>(1)
  const [matchups, setMatchups] = useState<ProcessedMatchup[]>([])
  const [loading, setLoading] = useState(true)
  const [fadeClass, setFadeClass] = useState("opacity-100")
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [dataProvenance, setDataProvenance] = useState<{
    hash: string
    fetchTime: Date
    source: string
  } | null>(null)

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
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("tv") === "1") {
      document.documentElement.dataset.tv = "1"
    }
  }, [])

  useEffect(() => {
    async function fetchMatchupData() {
      if (!currentLeague) return

      setLoading(true)
      setError(null)

      try {
        console.log("[v0] Fetching latest week data for", currentLeague.name)

        const maxRetries = 2
        let attempt = 0
        let lastError: Error | null = null

        while (attempt < maxRetries) {
          try {
            const format = LEAGUE_FORMAT[currentLeague.leagueId]
            if (!format) {
              console.log("[v0] League not in format mapping, skipping:", currentLeague.leagueId)
              setError("League format not supported")
              setMatchups([])
              setLoading(false)
              return
            }

            const latestWeek = await getLatestWeekWithData(currentLeague.leagueId)
            console.log("[v0] Latest week detected:", latestWeek)
            setCurrentWeek(latestWeek)

            const [usersResult, rostersResult, matchupsResult] = await Promise.all([
              getUsers(currentLeague.leagueId).catch((err) => {
                console.error("[v0] Users fetch failed:", err)
                throw new Error(`Failed to fetch users: ${err.message}`)
              }),
              getRosters(currentLeague.leagueId).catch((err) => {
                console.error("[v0] Rosters fetch failed:", err)
                throw new Error(`Failed to fetch rosters: ${err.message}`)
              }),
              getMatchups(currentLeague.leagueId, latestWeek).catch((err) => {
                console.error("[v0] Matchups fetch failed:", err)
                throw new Error(`Failed to fetch matchups: ${err.message}`)
              }),
            ])

            console.log("[v0] All data fetched successfully")

            if (format === "guillotine") {
              const processed = processGuillotineStandings(
                matchupsResult.data,
                usersResult.data,
                rostersResult.data,
                latestWeek,
              )
              setMatchups(processed)
              ;(window as any).guillotineData = { users: usersResult.data, rosters: rostersResult.data }
            } else {
              const processed = processMatchupsForDisplay(
                matchupsResult.data,
                usersResult.data,
                rostersResult.data,
                latestWeek,
              )
              setMatchups(processed)
            }

            setDataProvenance({
              hash: usersResult.hash,
              fetchTime: usersResult.fetchTime,
              source: "sleeper",
            })

            setRetryCount(0)
            break
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error"
            console.error("[v0] Fetch attempt failed:", errorMessage)

            if (errorMessage.includes("League ID not allowed")) {
              console.log("[v0] League not allowed, skipping to next league")
              setError("League not supported")
              setMatchups([])
              return
            }

            if (
              errorMessage.includes("Expected object, received null") ||
              errorMessage.includes("invalid_type") ||
              errorMessage.includes("Zod")
            ) {
              console.log("[v0] Skipping league due to data format issues")
              setError("League format not supported")
              setMatchups([])
              return
            }

            lastError = err as Error
            attempt++
            if (attempt < maxRetries) {
              const delay = 2000
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
          if (retryCount < 3) {
            fetchMatchupData()
          }
        }, 5000)
      } finally {
        setLoading(false)
      }
    }

    fetchMatchupData()

    const refreshInterval = setInterval(fetchMatchupData, 3 * 60 * 1000)
    return () => clearInterval(refreshInterval)
  }, [currentLeague, retryCount])

  const errorFallback = (
    <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6 text-center">
      <div className="text-6xl">⚠️</div>
      <h1 className="text-4xl font-bold text-red-400">Connection Issue</h1>
      <p className="text-xl text-muted-foreground max-w-md">
        {error || "Something went wrong. The display will automatically retry."}
      </p>
      <div className="text-sm text-muted-foreground">Retry attempt: {retryCount}/3 • Auto-retry in 5 seconds</div>
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
      <div className="min-h-[100svh] w-screen overflow-hidden bg-black text-slate-100 flex flex-col items-center px-3 sm:px-4 py-4">
        <div className="max-w-[500px] sm:max-w-[600px] md:max-w-[900px] mx-auto w-full">
          <div className={`space-y-6 transition-opacity duration-300 ${fadeClass}`}>
            <div className="text-center space-y-4">
              <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-bold text-balance leading-tight">
                {currentLeague.name} — Week {currentWeek} Matchups
              </h1>
              <p className="text-[clamp(0.9rem,2vw,1.1rem)] text-slate-400">
                {siteConfig.season} Season • {currentLeague.type} League
              </p>
              <p className="text-[clamp(0.8rem,1.5vw,0.9rem)] text-slate-500">
                Auto-updating every 3 minutes • Week detection: automatic
              </p>
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

                    return matchups.map((matchup) => (
                      <div
                        key={matchup.matchupId}
                        className="w-full rounded-2xl border border-gray-600 bg-black shadow-sm p-4 md:p-6"
                      >
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3 shrink-0">
                              {matchup.teams[0].winProbability !== null ? (
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    matchup.teams[0].winProbability >= 0.5
                                      ? "bg-green-600/30 text-green-300 border border-green-500/50"
                                      : "bg-red-600/30 text-red-300 border border-red-500/50"
                                  }`}
                                >
                                  WIN {Math.round(matchup.teams[0].winProbability * 100)}%
                                </span>
                              ) : matchup.teams[0].isPreGame ? (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-600/30 text-slate-300 border border-slate-500/50">
                                  Pre-game
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600/30 text-blue-300 border border-blue-500/50">
                                  Projected
                                </span>
                              )}

                              <span className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-bold tabular-nums">
                                {matchup.teams[0].points !== null
                                  ? matchup.teams[0].points.toFixed(1)
                                  : matchup.teams[0].projection > 0
                                    ? matchup.teams[0].projection.toFixed(1)
                                    : "—"}
                              </span>
                            </div>

                            <div className="px-3 py-1 rounded-full bg-slate-800/80 text-[clamp(0.9rem,2vw,1.1rem)] font-bold border border-slate-700 shrink-0">
                              VS
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-bold tabular-nums">
                                {matchup.teams[1].points !== null
                                  ? matchup.teams[1].points.toFixed(1)
                                  : matchup.teams[1].projection > 0
                                    ? matchup.teams[1].projection.toFixed(1)
                                    : "—"}
                              </span>

                              {matchup.teams[1].winProbability !== null ? (
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    matchup.teams[1].winProbability >= 0.5
                                      ? "bg-green-600/30 text-green-300 border border-green-500/50"
                                      : "bg-red-600/30 text-red-300 border border-red-500/50"
                                  }`}
                                >
                                  WIN {Math.round(matchup.teams[1].winProbability * 100)}%
                                </span>
                              ) : matchup.teams[1].isPreGame ? (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-600/30 text-slate-300 border border-slate-500/50">
                                  Pre-game
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600/30 text-blue-300 border border-blue-500/50">
                                  Projected
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-4">
                            {matchup.teams.map((team, index) => (
                              <div key={team.rosterId} className="flex items-center gap-3 min-w-0 flex-1">
                                {team.avatar ? (
                                  <img
                                    src={team.avatar || "/placeholder.svg"}
                                    alt={team.ownerName}
                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-slate-700 shadow-lg flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                    <span className="text-xs font-bold text-slate-300">
                                      {team.ownerName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-[clamp(0.9rem,2vw,1.1rem)] truncate">
                                    {team.ownerName}
                                  </div>
                                  <div className="text-[clamp(0.8rem,1.5vw,0.9rem)] text-slate-400 truncate">
                                    @{team.handle} {team.seed}
                                  </div>

                                  {team.winProbability !== null && (
                                    <div className="mt-2 w-full h-1 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700">
                                      <div
                                        className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000 shadow-inner"
                                        style={{
                                          width: `${Math.max(2, Math.min(98, team.winProbability * 100))}%`,
                                        }}
                                      />
                                    </div>
                                  )}
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

                    if (format === "guillotine") {
                      return (
                        <div className="w-full rounded-2xl border border-gray-600 bg-black shadow-sm p-4 md:p-6">
                          <div className="text-center py-8">
                            <div className="text-4xl mb-4">⚔️</div>
                            <p className="text-[clamp(1rem,2.5vw,1.25rem)] text-slate-400">Guillotine League</p>
                            <p className="text-[clamp(0.8rem,1.5vw,0.9rem)] text-slate-500 mt-2">
                              Loading standings data...
                            </p>
                          </div>
                        </div>
                      )
                    } else {
                      return (
                        <div className="w-full rounded-2xl border border-gray-600 bg-black shadow-sm p-4 md:p-6">
                          <div className="text-center py-8">
                            <div className="text-4xl mb-4">📊</div>
                            <p className="text-[clamp(1rem,2.5vw,1.25rem)] text-slate-400">
                              No matchup data available for this week.
                            </p>
                            <p className="text-[clamp(0.8rem,1.5vw,0.9rem)] text-slate-500 mt-2">
                              The display will automatically retry.
                            </p>
                          </div>
                        </div>
                      )
                    }
                  })()}
            </div>

            {matchups.length === 0 && !error && (
              <div className="text-center py-16">
                <div className="text-6xl mb-6">📊</div>
                <p className="text-[clamp(1rem,2.5vw,1.25rem)] text-slate-400">
                  No matchup data available for this week.
                </p>
                <p className="text-[clamp(0.8rem,1.5vw,0.9rem)] text-slate-500 mt-2">
                  The display will automatically retry.
                </p>
              </div>
            )}

            {dataProvenance && (
              <div className="text-center text-[clamp(0.7rem,1.2vw,0.8rem)] text-slate-500 bg-black/50 rounded-lg p-3 border border-gray-600">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span>Data: {dataProvenance.source}</span>
                  <span>•</span>
                  <span>Last fetch: {getRelativeTime(dataProvenance.fetchTime)}</span>
                  <span>•</span>
                  <span>Hash: {dataProvenance.hash.slice(0, 8)}</span>
                  <span>•</span>
                  <a
                    href={`/api/sleeper/league/${currentLeague.leagueId}/matchups/${currentWeek}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View source
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
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
        points: matchup.points,
      })

      return {
        rosterId: matchup.roster_id,
        ownerName: user?.display_name || "Unknown",
        handle: user?.username || user?.display_name?.toLowerCase().replace(/\s+/g, "") || "unknown",
        avatar: avatarUrl(user?.avatar),
        points: matchup.points || 0,
        projectedPoints: roster?.settings?.fpts || roster?.settings?.fpts_decimal || 0,
      }
    })
    .sort((a, b) => b.points - a.points)

  const totalPoints = teamScores.reduce((sum, team) => sum + team.points, 0)
  const leagueAverage = totalPoints / teamScores.length
  const maxPoints = Math.max(...teamScores.map((t) => t.points))

  const teamsWithSafety = teamScores.map((team, index) => ({
    ...team,
    rank: index + 1,
    safetyPercentage: Math.min(95, Math.max(5, (team.points / maxPoints) * 100)),
    zone: index >= teamScores.length - 1 ? "chop" : index >= teamScores.length - 3 ? "danger" : "safe",
  }))

  return (
    <div className="w-full rounded-2xl border border-gray-600 bg-black shadow-sm p-4 md:p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-100">Chopping Block</h3>
            <p className="text-sm text-slate-400 mt-1">Lowest scorer gets eliminated</p>
          </div>
          <div className="flex items-center gap-2 text-cyan-400">
            <span className="text-sm font-medium">WEEK 1</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider border-b border-gray-600">
          <div className="col-span-1">RANK</div>
          <div className="col-span-5">TEAM</div>
          <div className="col-span-3 text-center">SAFE %</div>
          <div className="col-span-3 text-right">PROJ/F</div>
        </div>

        <div className="space-y-1">
          {teamsWithSafety.filter((team) => team.zone === "chop").length > 0 && (
            <>
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="w-4 h-4 text-red-400">⚔️</div>
                <span className="text-sm font-bold text-red-400 uppercase tracking-wider">CHOP ZONE</span>
                <div className="flex-1 h-px bg-red-500"></div>
              </div>
              {teamsWithSafety
                .filter((team) => team.zone === "chop")
                .map((team) => (
                  <TeamRow key={team.rosterId} team={team} />
                ))}
            </>
          )}

          {teamsWithSafety.filter((team) => team.zone === "danger").length > 0 && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 mt-4">
                <div className="w-4 h-4 text-yellow-400">⚠️</div>
                <span className="text-sm font-bold text-yellow-400 uppercase tracking-wider">DANGER</span>
                <div className="flex-1 h-px bg-yellow-500"></div>
              </div>
              {teamsWithSafety
                .filter((team) => team.zone === "danger")
                .map((team) => (
                  <TeamRow key={team.rosterId} team={team} />
                ))}
            </>
          )}

          {teamsWithSafety.filter((team) => team.zone === "safe").length > 0 && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 mt-4">
                <div className="w-4 h-4 text-green-400">✅</div>
                <span className="text-sm font-bold text-green-400 uppercase tracking-wider">SAFE</span>
                <div className="flex-1 h-px bg-green-500"></div>
              </div>
              {teamsWithSafety
                .filter((team) => team.zone === "safe")
                .map((team) => (
                  <TeamRow key={team.rosterId} team={team} />
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamRow({ team }: { team: any }) {
  const zoneColors = {
    chop: "text-red-300",
    danger: "text-yellow-300",
    safe: "text-slate-200",
  }

  const progressColors = {
    chop: "from-red-500 to-red-400",
    danger: "from-yellow-500 to-yellow-400",
    safe: "from-green-500 to-green-400",
  }

  return (
    <div className="grid grid-cols-12 gap-4 items-center px-3 py-3 hover:bg-gray-700/50 rounded-lg transition-colors">
      <div className="col-span-1">
        <span className={`text-lg font-bold ${zoneColors[team.zone as keyof typeof zoneColors]}`}>{team.rank}</span>
      </div>

      <div className="col-span-5 flex items-center gap-3">
        {team.avatar ? (
          <img
            src={team.avatar || "/placeholder.svg"}
            alt={team.ownerName}
            className="w-10 h-10 rounded-full border-2 border-gray-500"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-600 border-2 border-gray-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{team.ownerName.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className={`font-bold text-base truncate ${zoneColors[team.zone as keyof typeof zoneColors]}`}>
            Team {team.ownerName}
          </div>
          <div className="text-sm text-slate-400 truncate">@{team.handle}</div>
        </div>
      </div>

      <div className="col-span-3 flex flex-col items-center gap-2">
        <div className="w-full bg-gray-700 rounded-full h-2 border border-gray-600">
          <div
            className={`h-full bg-gradient-to-r ${progressColors[team.zone as keyof typeof progressColors]} rounded-full transition-all duration-1000`}
            style={{ width: `${team.safetyPercentage}%` }}
          />
        </div>
        <span className="text-sm font-medium text-cyan-400">{Math.round(team.safetyPercentage)}%</span>
      </div>

      <div className="col-span-3 text-right">
        <div className={`text-xl font-bold tabular-nums ${zoneColors[team.zone as keyof typeof zoneColors]}`}>
          {team.projectedPoints > 0 ? team.projectedPoints.toFixed(2) : "-"}
        </div>
        <div className="text-sm text-slate-400 tabular-nums">{team.points.toFixed(2)}</div>
      </div>
    </div>
  )
}

function processGuillotineStandings(matchups: any[], users: any[], rosters: any[], week: number): ProcessedMatchup[] {
  if (!Array.isArray(matchups)) {
    console.log("[v0] Non-array matchups detected for Guillotine league")
    return []
  }

  const teamStandings = matchups
    .map((matchup) => {
      const roster = rosters.find((r) => r.roster_id === matchup.roster_id)
      const user = users.find((u) => u.user_id === roster?.owner_id)

      const points = matchup.points || 0
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
      const scoreA = a.points > 0 ? a.points : a.projection
      const scoreB = b.points > 0 ? b.points : b.projection
      return scoreB - scoreA
    })

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
        points: 0,
        projection: 0,
        winProbability: 0,
      },
    ] as [MatchupTeam, MatchupTeam],
  }))
}

function processMatchupsForDisplay(matchups: any[], users: any[], rosters: any[], week: number): ProcessedMatchup[] {
  if (!Array.isArray(matchups)) {
    console.log("[v0] Non-array matchups detected - unsupported league format")
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
      const processedTeams = teams.map((team: any) => {
        const roster = rosters.find((r) => r.roster_id === team.roster_id)
        const user = users.find((u) => u.user_id === roster?.owner_id)

        const rawPoints = Number(team.points ?? 0)
        const points = week === 1 && rawPoints === 0 ? null : rawPoints
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
          winProbability: null, // Will be calculated below
          isPreGame: points === null,
        }
      })

      let winProbA: number | null = null

      const team1Points = processedTeams[0].points
      const team2Points = processedTeams[1].points
      const totalPoints = (team1Points || 0) + (team2Points || 0)

      // Pre-game state - both teams have no points
      if (team1Points === null && team2Points === null) {
        winProbA = null
      }
      // Both teams have 0 or negative points - no meaningful probability
      else if ((team1Points || 0) <= 0 && (team2Points || 0) <= 0) {
        winProbA = null
      }
      // Very early game with minimal scoring - hide probabilities
      else if (totalPoints < 3) {
        winProbA = null
      }
      // Actual scoring has begun - calculate realistic probabilities
      else if (team1Points !== null && team2Points !== null) {
        const pointDiff = team1Points - team2Points

        if (Math.abs(pointDiff) < 0.1) {
          winProbA = 0.5 // Essentially tied
        } else {
          // More aggressive scaling for actual point differences
          const advantage = Math.abs(pointDiff)
          let probabilityShift: number

          if (advantage < 5) {
            probabilityShift = advantage * 0.08 // 8% per point for small differences
          } else if (advantage < 15) {
            probabilityShift = 0.4 + (advantage - 5) * 0.03 // Slower scaling for larger differences
          } else {
            probabilityShift = 0.7 + Math.min((advantage - 15) * 0.01, 0.2) // Cap at 90%
          }

          winProbA = pointDiff > 0 ? 0.5 + probabilityShift : 0.5 - probabilityShift
        }
      }
      // Fall back to projections if available
      else {
        const proj1 = processedTeams[0].projection
        const proj2 = processedTeams[1].projection

        if (proj1 > 0 && proj2 > 0) {
          const projDiff = proj1 - proj2
          winProbA = 0.5 + (projDiff / 80) * 0.2 // More conservative projection scaling
        } else {
          winProbA = null // No meaningful data
        }
      }

      // Clamp to reasonable bounds
      if (winProbA !== null) {
        winProbA = Math.max(0.15, Math.min(0.85, winProbA))
      }

      processedTeams[0].winProbability = winProbA
      processedTeams[1].winProbability = winProbA !== null ? 1 - winProbA : null

      processedMatchups.push({
        matchupId,
        teams: processedTeams as [MatchupTeam, MatchupTeam],
      })
    }
  })

  return processedMatchups
}

function calculateProjection(roster: any, allRosters: any[], currentWeek: number): number {
  if (currentWeek <= 1) {
    return 0
  }

  const historicalWeeks = Math.max(0, currentWeek - 1)
  if (historicalWeeks < 2) {
    return 0
  }

  const seasonAvg = roster?.settings?.fpts || roster?.settings?.fpts_decimal || 0
  return seasonAvg > 0 ? seasonAvg : 0
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
