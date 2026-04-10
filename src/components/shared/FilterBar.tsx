"use client"

import { Search } from "lucide-react"

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
}

interface FilterBarProps {
  filters?: FilterConfig[]
  searchPlaceholder?: string
  values: Record<string, string>
  onFilterChange: (key: string, value: string) => void
}

export function FilterBar({
  filters = [],
  searchPlaceholder = "Buscar...",
  values,
  onFilterChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={values["search"] ?? ""}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className="w-full border border-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 bg-card transition-all duration-200"
        />
      </div>

      {/* Dynamic select filters */}
      {filters.map((f) => (
        <select
          key={f.key}
          value={values[f.key] ?? ""}
          onChange={(e) => onFilterChange(f.key, e.target.value)}
          className="border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 bg-card appearance-none cursor-pointer transition-all duration-200"
        >
          <option value="">{f.label}</option>
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  )
}
