import Link from "next/link"
import { authorizeOrRedirect } from "@/features/auth/queries"
import { getUserRoles } from "@/features/memberships/queries"
import { ContextSelectorCard } from "@/features/memberships/components/ContextSelectorCard"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

async function enterPlayerMode() {
  "use server"
  const cookieStore = await cookies()
  cookieStore.set("player_mode", "1", { path: "/", httpOnly: true, sameSite: "lax" })
  redirect("/dashboard")
}

export default async function ContextSelectorPage() {
  const ctx = await authorizeOrRedirect()
  const roles = await getUserRoles(ctx.userId)

  if (roles.length === 0) {
    return (
      <div className="min-h-full bg-secondary flex items-center justify-center p-6">
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
    <div className="min-h-screen bg-secondary flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="size-8 rounded bg-foreground flex items-center justify-center">
              <span className="text-white text-sm font-black">M</span>
            </div>
            <span className="text-foreground font-black text-sm uppercase tracking-[-0.03em]">MATCHPOINT</span>
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
              className="flex items-center gap-4 p-5 rounded-xl border border-foreground bg-foreground hover:opacity-90 transition-all group"
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

        {/* Player mode — sets cookie to skip redirect loop */}
        <div className="mt-6 text-center">
          <form action={enterPlayerMode}>
            <button
              type="submit"
              className="text-xs font-black uppercase tracking-[0.1em] text-zinc-400 hover:text-foreground transition-colors"
            >
              Continuar como Jugador →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
