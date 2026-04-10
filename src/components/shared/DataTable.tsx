"use client"

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T extends { id?: string }> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  onRowClick?: (item: T) => void
  keyExtractor?: (item: T) => string
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  emptyMessage = "Sin datos",
  onRowClick,
  keyExtractor,
}: DataTableProps<T>) {
  const getKey = keyExtractor ?? ((item: T) => item.id ?? String(Math.random()))

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="grid border-b border-border px-5 py-3 bg-muted"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((col) => (
          <div key={col.key} className={`text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 ${col.className ?? ""}`}>
            {col.header}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border-subtle">
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-14">
            <p className="text-sm font-bold text-zinc-400">{emptyMessage}</p>
          </div>
        ) : (
          data.map((item, i) => (
            <div
              key={getKey(item)}
              className={`animate-fade-in grid px-5 py-3.5 items-center ${onRowClick ? "cursor-pointer hover:bg-secondary transition-colors duration-150" : ""}`}
              style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, animationDelay: `${i * 0.03}s` }}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <div key={col.key} className={`text-sm text-foreground ${col.className ?? ""}`}>
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? "—")}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
