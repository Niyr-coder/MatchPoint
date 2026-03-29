"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { NAV_LINKS, SITE_NAME } from "@/lib/constants"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[#e5e5e5]">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-[#0a0a0a] shrink-0">
          <span className="text-[#16a34a]">●</span>
          {SITE_NAME}
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="px-4 py-2 rounded-full text-sm font-semibold text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex shrink-0">
          <a
            href="/login"
            className="btn-pill bg-[#0a0a0a] text-white px-6 py-2 text-sm"
          >
            Únete Gratis
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-[#0a0a0a] rounded-lg hover:bg-[#f5f5f5] transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden bg-white overflow-hidden transition-all duration-300 ${
          isMenuOpen ? "max-h-64" : "max-h-0"
        }`}
      >
        <div className="px-4 pb-4 pt-2 space-y-1 border-t border-[#e5e5e5]">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-[#737373] hover:text-[#0a0a0a]"
            >
              {label}
            </a>
          ))}
          <div className="pt-3 border-t border-[#e5e5e5]">
            <a
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="btn-pill bg-[#0a0a0a] text-white px-6 py-2.5 w-full text-sm"
            >
              Únete Gratis
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
