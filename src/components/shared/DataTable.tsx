"use client"

import { motion } from "framer-motion"

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
    <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden">
      {/* Header */}
      <div className="grid border-b border-[#e5e5e5] px-5 py-3 bg-zinc-50/60"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((col) => (
          <div key={col.key} className={`text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 ${col.className ?? ""}`}>
            {col.header}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#f0f0f0]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-14">
            <p className="text-sm font-bold text-zinc-400">{emptyMessage}</p>
          </div>
        ) : (
          data.map((item, i) => (
            <motion.div
              key={getKey(item)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className={`grid px-5 py-3.5 items-center ${onRowClick ? "cursor-pointer hover:bg-zinc-50 transition-colors" : ""}`}
              style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <div key={col.key} className={`text-sm text-[#0a0a0a] ${col.className ?? ""}`}>
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? "—")}
                </div>
              ))}
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
