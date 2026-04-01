"use client"

import { Button } from "@/components/ui/button"
import { Trophy, AlertTriangle } from "lucide-react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function TournamentsError({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="relative">
        <div className="size-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <Trophy className="size-7 text-red-400" />
        </div>
        <div className="absolute -top-1 -right-1 size-5 rounded-full bg-red-500 flex items-center justify-center">
          <AlertTriangle className="size-3 text-white" />
        </div>
      </div>

      <div className="text-center max-w-sm">
        <h2 className="text-base font-black uppercase tracking-tight text-[#0a0a0a]">
          Error al cargar torneos
        </h2>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
          {error.message ?? "No se pudieron cargar los torneos. Por favor intenta de nuevo."}
        </p>
        {error.digest && (
          <p className="mt-1 text-[10px] font-mono text-zinc-300">ref: {error.digest}</p>
        )}
      </div>

      <Button onClick={reset} className="btn-pill">
        Intentar de nuevo
      </Button>
    </div>
  )
}
