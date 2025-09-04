import { getLeague } from "@/lib/sleeper"
import { config } from "@/config/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Trophy, Users, Calendar, BarChart3 } from "lucide-react"

export default async function HomePage() {
  const league = await getLeague()

  const quickLinks = [
    {
      title: "Standings",
      description: "View current league standings and team records",
      href: "/standings",
      icon: BarChart3,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Managers",
      description: "See all league managers and their teams",
      href: "/managers",
      icon: Users,
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Drafts",
      description: "Check draft information and upcoming picks",
      href: "/drafts",
      icon: Calendar,
      color: "text-purple-600 dark:text-purple-400",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Trophy className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          <h1 className="text-4xl font-bold text-balance">{league.name}</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          {config.season} Season • {league.settings.num_teams} Teams
        </p>
        <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
          Welcome to your fantasy football league dashboard. Track standings, manage your team, and stay up to date with
          all league activities.
        </p>
      </div>

      {/* League Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">League Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize">{league.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sport:</span>
                <span className="font-medium capitalize">{league.sport}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Teams:</span>
                <span className="font-medium">{league.settings.num_teams}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Draft Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rounds:</span>
                <span className="font-medium">{league.settings.draft_rounds}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Week:</span>
                <span className="font-medium">{league.settings.start_week}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Playoff Start:</span>
                <span className="font-medium">Week {league.settings.playoff_week_start}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waiver Type:</span>
                <span className="font-medium">{league.settings.waiver_type === 0 ? "Free Agency" : "Waivers"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trade Deadline:</span>
                <span className="font-medium">Week {league.settings.trade_deadline}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bench Slots:</span>
                <span className="font-medium">{league.roster_positions.filter((pos) => pos === "BN").length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Quick Navigation</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Card key={link.href} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${link.color}`} />
                    <CardTitle className="text-lg">{link.title}</CardTitle>
                  </div>
                  <CardDescription className="text-balance">{link.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={link.href}>View {link.title}</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
