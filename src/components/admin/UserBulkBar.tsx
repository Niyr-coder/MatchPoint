"use client"

import { Loader2 } from "lucide-react"

interface UserBulkBarProps {
  count: number
  loading: boolean
  onSuspend: () => void
  onUnsuspend: () => void
  onDelete: () => void
  onClear: () => void
}

export function UserBulkBar({
  count,
  loading,
  onSuspend,
  onUnsuspend,
  onDelete,
  onClear,
}: UserBulkBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap rounded-xl bg-zinc-950 px-4 py-3">
      <span className="text-sm font-bold text-white mr-auto">
        {count} {count === 1 ? "usuario seleccionado" : "usuarios seleccionados"}
      </span>
      <button
        onClick={onSuspend}
        disabled={loading}
        className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-amber-400/30 text-amber-300 hover:bg-amber-400/10 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-3.5 animate-spin inline" /> : "Suspender"}
      </button>
      <button
        onClick={onUnsuspend}
        disabled={loading}
        className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-green-400/30 text-green-300 hover:bg-green-400/10 transition-colors disabled:opacity-50"
      >
        Reactivar
      </button>
      <button
        onClick={onDelete}
        disabled={loading}
        className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-400/30 text-red-300 hover:bg-red-400/10 transition-colors disabled:opacity-50"
      >
        Eliminar
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
