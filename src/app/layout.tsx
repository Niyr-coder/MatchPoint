import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Domina Tu Juego`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["fútbol", "pádel", "tenis", "pickleball", "deportes", "canchas", "torneos"],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://matchpoint.vercel.app"),
  openGraph: {
    title: `${SITE_NAME} — Domina Tu Juego`,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Domina Tu Juego`,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-white text-[#0a0a0a] antialiased">
        {children}
      </body>
    </html>
  )
}
