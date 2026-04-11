"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import Link from "next/link"
import { Search, Users, Building2, Trophy, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SearchResult } from "@/app/api/admin/search/route"

const TYPE_META: Record<SearchResult["type"], { icon: React.ReactNode; label: string; dot: string }> = {
  user:       { icon: <Users className="size-3" />,     label: "Usuario",   dot: "bg-violet-400" },
  club:       { icon: <Building2 className="size-3" />, label: "Club",      dot: "bg-amber-400" },
  tournament: { icon: <Trophy className="size-3" />,    label: "Torneo",    dot: "bg-sky-400" },
}

export function ControlTowerSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
        const json = await res.json() as { data: { results: SearchResult[] } | null }
        const items = json.data?.results ?? []
        setResults(items)
        setOpen(items.length > 0)
      } catch { /* silent */ }
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 280)
  }

  const clear = () => {
    setQuery("")
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className={cn(
        "flex items-center gap-2 bg-muted border border-border rounded-xl px-3 py-2 transition-all",
        open && "border-zinc-300 shadow-sm"
      )}>
        {isPending
          ? <Loader2 className="size-3.5 text-zinc-400 shrink-0 animate-spin" />
          : <Search className="size-3.5 text-zinc-400 shrink-0" />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar usuarios, clubs, torneos…"
          className="bg-transparent text-xs text-zinc-700 placeholder:text-zinc-400 outline-none w-48 lg:w-64"
        />
        {query ? (
          <button onClick={clear} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="size-3" />
          </button>
        ) : (
          <span className="text-[9px] font-black text-zinc-300 border border-zinc-200 px-1 py-0.5 rounded shrink-0">
            ⌘K
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[280px]">
          {(["user", "club", "tournament"] as SearchResult["type"][]).map((type) => {
            const group = results.filter((r) => r.type === type)
            if (group.length === 0) return null
            const meta = TYPE_META[type]
            return (
              <div key={type}>
                <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                  <span className={cn("size-1.5 rounded-full", meta.dot)} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                    {meta.label}s
                  </span>
                </div>
                {group.map((r) => (
                  <Link
                    key={r.id}
                    href={r.href}
                    onClick={() => { setOpen(false); setQuery("") }}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <span className="text-zinc-400 shrink-0">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 truncate">{r.title}</p>
                      {r.subtitle && (
                        <p className="text-[10px] text-zinc-400 truncate">{r.subtitle}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )
          })}
          <div className="px-3 py-2 border-t border-border">
            <p className="text-[9px] text-zinc-400">{results.length} resultado{results.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}
    </div>
  )
}
