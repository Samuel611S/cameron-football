import { getStandingsData } from "@/lib/sleeper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, TrendingUp, TrendingDown, Calendar } from "lucide-react"

export default async function StandingsPage() {
  const standings = await getStandingsData()

  const seasonStarted = standings.some((team) => team.wins > 0 || team.losses > 0 || team.pointsFor > 0)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          League Standings
        </h1>
        <p className="text-muted-foreground">Current team rankings and statistics</p>
        {!seasonStarted && (
          <div className="flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">
              Season hasn't started yet - standings will update after games begin
            </span>
          </div>
        )}
      </div>

      {/* Standings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Rankings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">Rank</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Team</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Record</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Win %</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Points For</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Points Against</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Diff</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, index) => {
                  const totalGames = team.wins + team.losses + team.ties
                  const winPercentage = totalGames > 0 ? (team.wins / totalGames) * 100 : 0
                  const pointsDiff = team.pointsFor - team.pointsAgainst
                  const isPlayoffPosition = index < 6 // Assuming top 6 make playoffs

                  return (
                    <tr key={team.rosterId} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{index + 1}</span>
                          {isPlayoffPosition && (
                            <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs font-medium">
                              Playoff
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{team.teamName}</div>
                          <div className="text-sm text-muted-foreground">{team.ownerName}</div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="font-mono">
                          <span className="text-green-600 dark:text-green-400 font-medium">{team.wins}</span>
                          <span className="text-muted-foreground mx-1">-</span>
                          <span className="text-red-600 dark:text-red-400 font-medium">{team.losses}</span>
                          {team.ties > 0 && (
                            <>
                              <span className="text-muted-foreground mx-1">-</span>
                              <span className="text-yellow-600 dark:text-yellow-400 font-medium">{team.ties}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-mono">{winPercentage.toFixed(1)}%</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono">
                          {!seasonStarted && team.pointsFor === 0 ? "-" : team.pointsFor.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono">
                          {!seasonStarted && team.pointsAgainst === 0 ? "-" : team.pointsAgainst.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {!seasonStarted && pointsDiff === 0 ? (
                          <span className="font-mono text-muted-foreground">-</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {pointsDiff > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                            <span
                              className={`font-mono ${
                                pointsDiff > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {pointsDiff > 0 ? "+" : ""}
                              {pointsDiff.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {seasonStarted && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Highest Scoring</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const highestScoring = standings.reduce((prev, current) =>
                  prev.pointsFor > current.pointsFor ? prev : current,
                )
                return (
                  <div>
                    <div className="font-medium">{highestScoring.teamName}</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {highestScoring.pointsFor.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">points scored</div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Best Defense</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const bestDefense = standings.reduce((prev, current) =>
                  prev.pointsAgainst < current.pointsAgainst ? prev : current,
                )
                return (
                  <div>
                    <div className="font-medium">{bestDefense.teamName}</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {bestDefense.pointsAgainst.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">points allowed</div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">League Leader</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const leader = standings[0]
                return (
                  <div>
                    <div className="font-medium">{leader.teamName}</div>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {leader.wins}-{leader.losses}
                      {leader.ties > 0 && `-${leader.ties}`}
                    </div>
                    <div className="text-sm text-muted-foreground">record</div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
