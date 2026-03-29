import Link from "next/link"
import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getUserRoles } from "@/lib/auth/get-user-roles"
import { ContextSelectorCard } from "@/components/context-selector/ContextSelectorCard"

export default async function ContextSelectorPage() {
  const ctx = await authorizeOrRedirect()
  const roles = await getUserRoles(ctx.userId)

  if (roles.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-zinc-400">No tienes acceso a ningún club.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-green-500 hover:underline text-sm">
            Ir al inicio →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="size-8 rounded-full bg-green-600 flex items-center justify-center">
              <span className="text-white text-sm font-black">M</span>
            </div>
            <span className="text-white font-black tracking-tight">MATCHPOINT</span>
          </div>
          <h1 className="text-2xl font-black text-white">Selecciona tu espacio</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Tienes acceso a múltiples clubs. Elige desde dónde quieres entrar.
          </p>
        </div>

        {/* Admin card if applicable */}
        {ctx.globalRole === "admin" && (
          <div className="mb-4">
            <Link
              href="/admin"
              className="flex items-center gap-4 p-5 rounded-xl border border-red-800/50 bg-red-900/20 hover:border-red-600/70 hover:bg-red-900/30 transition-all group"
            >
              <div className="size-12 rounded-full bg-red-800 flex items-center justify-center shrink-0 font-black text-white">
                A
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white group-hover:text-red-400 transition-colors">
                  Panel de Administración
                </p>
                <p className="text-xs text-red-400/70 mt-0.5">Acceso global a la plataforma</p>
              </div>
              <span className="text-red-600 group-hover:text-red-400 transition-colors text-lg">→</span>
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
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Continuar como Jugador →
          </Link>
        </div>
      </div>
    </div>
  )
}
