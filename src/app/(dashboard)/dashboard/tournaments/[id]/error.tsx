"use client"

import { Button } from "@/components/ui/button"
import { Trophy, AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function TournamentDetailError({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/dashboard/tournaments"
        className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Todos los torneos
      </Link>

      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 px-4">
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
            Error al cargar el torneo
          </h2>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            {error.message ?? "No se pudo cargar la información del torneo. Por favor intenta de nuevo."}
          </p>
          {error.digest && (
            <p className="mt-1 text-[10px] font-mono text-zinc-300">ref: {error.digest}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={reset} className="btn-pill">
            Intentar de nuevo
          </Button>
          <Link
            href="/dashboard/tournaments"
            className="text-xs font-black text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Volver a torneos
          </Link>
        </div>
      </div>
    </div>
  )
}
