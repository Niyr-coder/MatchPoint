"use client"

import { Loader2 } from "lucide-react"

interface ClubBulkBarProps {
  count: number
  loading: boolean
  onActivate: () => void
  onDeactivate: () => void
  onClear: () => void
}

export function ClubBulkBar({
  count,
  loading,
  onActivate,
  onDeactivate,
  onClear,
}: ClubBulkBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap rounded-xl bg-zinc-950 px-4 py-3">
      <span className="text-sm font-bold text-white mr-auto">
        {count} {count === 1 ? "club seleccionado" : "clubs seleccionados"}
      </span>
      <button
        onClick={onActivate}
        disabled={loading}
        className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-green-400/30 text-green-300 hover:bg-green-400/10 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-3.5 animate-spin inline" /> : "Activar todos"}
      </button>
      <button
        onClick={onDeactivate}
        disabled={loading}
        className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-400/30 text-red-300 hover:bg-red-400/10 transition-colors disabled:opacity-50"
      >
        Desactivar todos
      </button>
      <button
        onClick={onClear}
        disabled={loading}
        className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-zinc-600 text-zinc-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        Cancelar
      </button>
    </div>
  )
}
