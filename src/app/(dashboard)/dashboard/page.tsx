import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { BentoCard } from "@/components/dashboard/BentoCard"

export default async function UserDashboardPage() {
  const ctx = await authorizeOrRedirect()
  const firstName = ctx.profile.first_name ?? "Jugador"
  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 grid-flow-dense">

      {/* Greeting — hero dark card */}
      <BentoCard
        variant="dark"
        className="col-span-2 lg:col-span-2 lg:row-span-2"
        index={0}
      >
        <div className="flex flex-col justify-between h-full py-2 min-h-[220px]">
          <p className="label-green">Bienvenido de vuelta</p>
          <div>
            <h1
              className="font-black text-white uppercase leading-[0.88] tracking-[-0.03em]"
              style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
            >
              Hola, {firstName}.
            </h1>
            <p className="mt-2 text-white/40 text-sm capitalize">{date}</p>
          </div>
        </div>
      </BentoCard>

      {/* Reservas — tall default card */}
      <BentoCard
        variant="default"
        icon="Calendar"
        label="01"
        title="Mis Reservas"
        subtitle="Tus últimas reservas de canchas"
        href="/dashboard/reservations"
        className="col-span-2 sm:col-span-1 lg:row-span-2"
        index={1}
      >
        <div className="flex flex-col justify-end flex-1 pt-2">
          <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
            Busca una cancha disponible y haz tu primera reserva.
          </p>
          <a href="/dashboard/reservations" className="btn-pill-sm self-start">
            Reservar cancha
          </a>
        </div>
      </BentoCard>

      {/* Canchas — accent card */}
      <BentoCard
        variant="accent"
        icon="Search"
        label="02"
        title="Canchas Cerca"
        subtitle="Fútbol, pádel, tenis, pickleball"
        href="/dashboard/search"
        className="col-span-2 sm:col-span-1 lg:col-span-1"
        index={2}
      >
        <div className="flex flex-col justify-end flex-1 pt-2">
          <a href="/dashboard/search" className="btn-pill-sm self-start">
            Explorar
          </a>
        </div>
      </BentoCard>

      {/* Torneos — default card */}
      <BentoCard
        variant="default"
        icon="Trophy"
        label="03"
        title="Torneos"
        subtitle="Compite con jugadores de tu nivel"
        href="/dashboard/tournaments"
        className="col-span-2 sm:col-span-1 lg:col-span-1"
        index={3}
      >
        <div className="flex flex-col justify-end flex-1 pt-2">
          <a href="/dashboard/tournaments" className="btn-pill-sm self-start">
            Ver torneos
          </a>
        </div>
      </BentoCard>

    </div>
  )
}
