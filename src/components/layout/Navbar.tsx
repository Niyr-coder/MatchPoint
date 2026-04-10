"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { NAV_LINKS, SITE_NAME } from "@/lib/constants"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
    <div className="bg-[#16a34a] text-white text-center py-2">
      <p className="text-xs font-black uppercase tracking-wider">
        ACCESO ANTICIPADO — Solo 500 cupos gratuitos.{" "}
        <a href="/login" className="underline underline-offset-2 hover:opacity-80">No te quedes fuera →</a>
      </p>
    </div>
    <header className="sticky top-0 z-50 w-full bg-card border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-foreground shrink-0">
          <span className="text-[#16a34a]">●</span>
          {SITE_NAME}
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="px-4 py-2 rounded-full text-sm font-semibold text-[#737373] hover:text-foreground hover:bg-muted transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex shrink-0">
          <a
            href="/login"
            className="btn-pill bg-foreground text-white px-6 py-2 text-sm"
          >
            Únete Gratis
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
          isMenuOpen ? "max-h-64" : "max-h-0"
        }`}
      >
        <div className="px-4 pb-4 pt-2 space-y-1 border-t border-border">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-[#737373] hover:text-foreground"
            >
              {label}
            </a>
          ))}
          <div className="pt-3 border-t border-border">
            <a
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="btn-pill bg-foreground text-white px-6 py-2.5 w-full text-sm"
            >
              Únete Gratis
            </a>
          </div>
        </div>
      </div>
    </header>
    </>
  )
}
