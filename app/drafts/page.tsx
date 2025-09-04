import { getDraftsData } from "@/lib/sleeper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, Trophy } from "lucide-react"

export default async function DraftsPage() {
  const drafts = await getDraftsData()

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          Draft Information
        </h1>
        <p className="text-muted-foreground">View draft details and pick order</p>
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Drafts Found</h3>
            <p className="text-muted-foreground">There are currently no drafts scheduled for this league.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {drafts.map((draft) => (
            <div key={draft.draft_id} className="space-y-6">
              {/* Draft Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      {draft.type === "snake" ? "Snake Draft" : "Auction Draft"}
                    </CardTitle>
                    <Badge variant={draft.status === "complete" ? "default" : "secondary"} className="capitalize">
                      {draft.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Draft Date</span>
                      </div>
                      <p className="font-medium">{formatDate(draft.startTime)}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(draft.startTime)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Teams</span>
                      </div>
                      <p className="font-medium">{draft.settings.teams} Teams</p>
                      <p className="text-sm text-muted-foreground">{draft.settings.rounds} Rounds</p>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Draft Settings</div>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Pick Timer:</span>{" "}
                          <span className="font-medium">{draft.settings.pick_timer}s</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Type:</span>{" "}
                          <span className="font-medium capitalize">{draft.type}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Draft Order */}
              {draft.draftOrder && draft.draftOrder.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Draft Order</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {draft.draftOrder.map((pick) => {
                        const initials = pick.displayName
                          ? pick.displayName
                              .split(" ")
                              .map((name) => name[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : "??"

                        return (
                          <div
                            key={pick.userId}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                              {pick.pick}
                            </div>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={pick.avatar || undefined} alt={pick.displayName} />
                              <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{pick.displayName}</p>
                              {pick.teamName && (
                                <p className="text-sm text-muted-foreground truncate">{pick.teamName}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Draft Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{draft.settings.rounds}</div>
                    <p className="text-sm text-muted-foreground">Total Rounds</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{draft.settings.teams}</div>
                    <p className="text-sm text-muted-foreground">Teams</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {draft.settings.pick_timer}s
                    </div>
                    <p className="text-sm text-muted-foreground">Pick Timer</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {draft.settings.rounds * draft.settings.teams}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Picks</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
