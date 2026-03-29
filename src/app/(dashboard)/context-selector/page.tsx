import Link from "next/link"
import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getUserRoles } from "@/lib/auth/get-user-roles"
import { ContextSelectorCard } from "@/components/context-selector/ContextSelectorCard"

export default async function ContextSelectorPage() {
  const ctx = await authorizeOrRedirect()
  const roles = await getUserRoles(ctx.userId)

  if (roles.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-zinc-500 text-sm">No tienes acceso a ningún club.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-green-600 hover:underline text-sm font-bold">
            Ir al inicio →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="size-8 rounded bg-[#0a0a0a] flex items-center justify-center">
              <span className="text-white text-sm font-black">M</span>
            </div>
            <span className="text-[#0a0a0a] font-black text-sm uppercase tracking-[-0.03em]">MATCHPOINT</span>
          </div>
          <h1 className="dash-heading">Selecciona tu espacio</h1>
          <p className="mt-3 text-sm text-zinc-500 font-medium">
            Tienes acceso a múltiples clubs. Elige desde dónde quieres entrar.
          </p>
        </div>

        {/* Admin card */}
        {ctx.globalRole === "admin" && (
          <div className="mb-4">
            <Link
              href="/admin"
              className="flex items-center gap-4 p-5 rounded-xl border border-[#0a0a0a] bg-[#0a0a0a] hover:opacity-90 transition-all group"
            >
              <div className="size-12 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <span className="font-black text-white text-lg">A</span>
              </div>
              <div className="flex-1">
                <p className="font-black text-white uppercase tracking-tight">
                  Panel de Administración
                </p>
                <p className="text-xs text-white/50 mt-0.5 font-medium">Acceso global a la plataforma</p>
              </div>
              <span className="text-white/50 group-hover:text-white transition-colors text-lg">→</span>
            </Link>
          </div>
        )}

        {/* Club role cards */}
        <div className="space-y-3">
          {roles.map((entry) => (
            <ContextSelectorCard key={`${entry.clubId}-${entry.role}`} entry={entry} />
          ))}
        </div>

        {/* Player mode link */}
        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-xs font-black uppercase tracking-[0.1em] text-zinc-400 hover:text-[#0a0a0a] transition-colors"
          >
            Continuar como Jugador →
          </Link>
        </div>
      </div>
    </div>
  )
}
