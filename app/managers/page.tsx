import { getManagersData } from "@/lib/sleeper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, User, Crown } from "lucide-react"

export default async function ManagersPage() {
  const managers = await getManagersData()

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          League Managers
        </h1>
        <p className="text-muted-foreground">Meet the {managers.length} managers in your league</p>
      </div>

      {/* Managers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {managers.map((manager, index) => {
          const initials = manager.displayName
            ? manager.displayName
                .split(" ")
                .map((name) => name[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            : manager.username?.slice(0, 2).toUpperCase() || "??"

          return (
            <Card key={manager.userId} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={manager.avatar || undefined} alt={manager.displayName} />
                      <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    {index === 0 && (
                      <div className="absolute -top-2 -right-2">
                        <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{manager.displayName}</CardTitle>
                    <p className="text-sm text-muted-foreground">@{manager.username}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                {manager.teamName && (
                  <div>
                    <Badge variant="secondary" className="text-sm">
                      {manager.teamName}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Manager #{index + 1}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Manager Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{managers.length}</div>
            <p className="text-sm text-muted-foreground">Active league members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Custom Team Names</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {managers.filter((m) => m.teamName).length}
            </div>
            <p className="text-sm text-muted-foreground">Managers with custom names</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Profile Pictures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {managers.filter((m) => m.avatar).length}
            </div>
            <p className="text-sm text-muted-foreground">Managers with avatars</p>
          </CardContent>
        </Card>
      </div>

      {/* Manager List View */}
      <Card>
        <CardHeader>
          <CardTitle>Manager Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {managers.map((manager, index) => (
              <div key={manager.userId} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={manager.avatar || undefined} alt={manager.displayName} />
                    <AvatarFallback>
                      {manager.displayName
                        ? manager.displayName
                            .split(" ")
                            .map((name) => name[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : manager.username?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{manager.displayName}</h3>
                      {index === 0 && <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
                    </div>
                    <p className="text-sm text-muted-foreground">@{manager.username}</p>
                    {manager.teamName && <p className="text-sm text-blue-600 dark:text-blue-400">{manager.teamName}</p>}
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">#{index + 1}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
