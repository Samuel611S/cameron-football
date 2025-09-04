import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { config } from "@/config/config"
import { Navigation } from "@/components/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: config.siteTitle,
  description: `${config.siteTitle} - Season ${config.season}`,
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="min-h-screen bg-background">
            <Suspense fallback={<div>Loading...</div>}>
              <Navigation />
            </Suspense>

            <main className="container mx-auto px-4 py-8">{children}</main>

            <footer className="border-t border-border bg-card mt-16">
              <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
                <p>
                  {config.siteTitle} - Season {config.season}
                </p>
                <p className="text-sm mt-2">Powered by Sleeper API</p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
