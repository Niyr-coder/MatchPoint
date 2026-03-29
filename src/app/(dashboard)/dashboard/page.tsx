import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { Calendar, Search, Trophy } from "lucide-react"
import { EmptyState } from "@/components/dashboard/EmptyState"

export default async function UserDashboardPage() {
  const ctx = await authorizeOrRedirect()
  const firstName = ctx.profile.first_name ?? "Jugador"

  return (
    <div>
      <div className="mb-8">
        <p className="label-green">Bienvenido de vuelta</p>
        <h1 className="text-2xl font-black text-white">Hola, {firstName} 👋</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {new Date().toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
            Mis Reservas Recientes
          </h2>
          <EmptyState
            icon={Calendar}
            title="No tienes reservas recientes"
            description="Busca una cancha disponible y haz tu primera reserva."
          />
        </section>

        <section>
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
            Canchas Cerca de Ti
          </h2>
          <EmptyState
            icon={Search}
            title="Explora canchas disponibles"
            description="Encuentra canchas de fútbol, pádel, tenis y pickleball en tu ciudad."
          />
        </section>

        <section>
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
            Torneos Activos
          </h2>
          <EmptyState
            icon={Trophy}
            title="No hay torneos activos ahora"
            description="Únete a torneos y compite con jugadores de tu nivel."
          />
        </section>
      </div>
    </div>
  )
}
