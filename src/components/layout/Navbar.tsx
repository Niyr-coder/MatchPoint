"use client"

import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import { NAV_LINKS, SITE_NAME } from "@/lib/constants"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      <header className={`sticky top-0 z-50 w-full backdrop-blur-xl border-b transition-all duration-300 ${
        scrolled
          ? "bg-white/95 border-border shadow-sm"
          : "bg-transparent border-transparent"
      }`}>
        <div className="container mx-auto px-6 sm:px-8 h-14 flex items-center justify-between" style={{ maxWidth: 1280 }}>
          {/* Logo */}
          <a href="/" className={`flex items-center gap-1.5 font-black text-[22px] tracking-[-0.03em] shrink-0 transition-colors duration-300 ${scrolled ? "text-foreground" : "text-white"}`}>
            <span className="text-primary text-[22px]">●</span>
            {SITE_NAME}
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors duration-300 ${scrolled ? "text-foreground hover:text-foreground/70" : "text-white/80 hover:text-white"}`}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <a
              href="/login"
              className={`px-4 py-2.5 text-[13px] font-black rounded-full transition-colors duration-300 ${scrolled ? "text-foreground hover:bg-muted" : "text-white/80 hover:text-white hover:bg-white/10"}`}
            >
              Iniciar sesión
            </a>
            <a
              href="#waitlist"
              className="btn-pill-green px-5 py-2.5 text-[13px]"
            >
              Únete gratis →
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className={`md:hidden p-2 rounded-lg transition-colors duration-300 ${scrolled ? "text-foreground hover:bg-muted" : "text-white hover:bg-white/10"}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden bg-white overflow-hidden transition-all duration-300 ${
            isMenuOpen ? "max-h-80" : "max-h-0"
          }`}
        >
          <div className="px-6 pb-4 pt-2 space-y-1 border-t border-border">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm font-medium text-foreground"
              >
                {label}
              </a>
            ))}
            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <a
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="btn-pill border border-border text-foreground px-6 py-2.5 w-full text-sm text-center"
              >
                Iniciar sesión
              </a>
              <a
                href="#waitlist"
                onClick={() => setIsMenuOpen(false)}
                className="btn-pill-green px-6 py-2.5 w-full text-sm text-center"
              >
                Únete gratis →
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
