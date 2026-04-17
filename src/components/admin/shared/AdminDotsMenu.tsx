"use client"

import { useRef, useEffect, useState } from "react"

interface DotsMenuItem {
  label: string
  onClick: () => void
  variant?: "default" | "danger"
  disabled?: boolean
}

interface AdminDotsMenuProps {
  items: DotsMenuItem[]
}

export function AdminDotsMenu({ items }: AdminDotsMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Más acciones"
        className="size-[26px] flex items-center justify-center rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-foreground hover:border-zinc-300 transition-colors text-[16px] leading-none"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 min-w-[140px]">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setOpen(false) }}
              disabled={item.disabled}
              className={`w-full text-left px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-40 ${
                item.variant === "danger"
                  ? "text-red-600 hover:bg-red-50"
                  : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
