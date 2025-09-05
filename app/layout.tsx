import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { siteConfig } from "@/config/config"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: siteConfig.siteTitle,
  description: `${siteConfig.siteTitle} - Season ${siteConfig.season}`,
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
          <div className="min-h-screen bg-black">
            <Suspense fallback={<div>Loading...</div>}>
              <main className="container mx-auto px-4 py-8">{children}</main>

              <footer className="border-t border-black bg-black mt-16">
                <div className="container mx-auto px-4 py-6 text-center text-slate-100">
                  <p>
                    {siteConfig.siteTitle} - Season {siteConfig.season}
                  </p>
                  <p className="text-sm mt-2">Powered by Sleeper API</p>
                  <p className="text-sm mt-1">Made by {siteConfig.madeBy}</p>
                </div>
              </footer>
            </Suspense>
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
