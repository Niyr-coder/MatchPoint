"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminError({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="size-14 rounded-2xl bg-red-50 flex items-center justify-center">
        <AlertTriangle className="size-7 text-red-500" />
      </div>

      <div className="text-center max-w-sm">
        <h2 className="text-base font-black uppercase tracking-tight text-[#0a0a0a]">
          Error de administración
        </h2>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
          {error.message ?? "No se pudo cargar el panel de administración."}
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
