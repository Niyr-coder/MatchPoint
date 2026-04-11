"use client"

import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import { NAV_LINKS, SITE_NAME } from "@/lib/constants"

const ANNOUNCE_DISMISS_KEY = "matchpoint_announce_dismissed"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [announceDismissed, setAnnounceDismissed] = useState(true)

  useEffect(() => {
    const dismissed = sessionStorage.getItem(ANNOUNCE_DISMISS_KEY)
    setAnnounceDismissed(dismissed === "1")
  }, [])

  function dismissAnnounce() {
    sessionStorage.setItem(ANNOUNCE_DISMISS_KEY, "1")
    setAnnounceDismissed(true)
  }

  return (
    <>
      {!announceDismissed && (
        <div className="bg-primary text-white text-center py-2 relative">
          <p className="text-xs font-black uppercase tracking-wider">
            ACCESO ANTICIPADO — Solo 500 cupos gratuitos.{" "}
            <a href="/login" className="underline underline-offset-2 hover:opacity-80">
              No te quedes fuera →
            </a>
          </p>
          <button
            onClick={dismissAnnounce}
            aria-label="Cerrar anuncio"
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-50 w-full bg-card border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-foreground shrink-0">
            <span className="text-primary">●</span>
            {SITE_NAME}
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="px-4 py-2 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <a
              href="#clubes"
              className="px-4 py-2 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Soy Club
            </a>
            <a
              href="/login"
              className="btn-pill bg-foreground text-background px-6 py-2 text-sm"
            >
              Juega Ahora
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-foreground rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden bg-card overflow-hidden transition-all duration-300 ${
            isMenuOpen ? "max-h-80" : "max-h-0"
          }`}
        >
          <div className="px-4 pb-4 pt-2 space-y-1 border-t border-border">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                {label}
              </a>
            ))}
            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <a
                href="#clubes"
                onClick={() => setIsMenuOpen(false)}
                className="btn-pill border border-border text-foreground px-6 py-2.5 w-full text-sm text-center"
              >
                Soy Club
              </a>
              <a
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="btn-pill bg-foreground text-background px-6 py-2.5 w-full text-sm"
              >
                Juega Ahora
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  )
}
