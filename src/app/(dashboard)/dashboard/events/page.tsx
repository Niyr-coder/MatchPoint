import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getAllEvents } from "@/lib/events/queries"
import { Calendar, MapPin } from "lucide-react"

const SPORT_LABEL: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default async function EventsPage() {
  await authorizeOrRedirect()
  const { events } = await getAllEvents(0, 20)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
          Plataforma
        </p>
        <h1 className="text-3xl font-black uppercase tracking-[-0.03em] text-[#0a0a0a]">
          Eventos Oficiales
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Torneos, ligas y actividades organizadas por MatchPoint
        </p>
      </div>

      {/* Events grid */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-[#e5e5e5] rounded-2xl">
          <Calendar className="size-10 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-400">No hay eventos próximos</p>
          <p className="text-xs text-zinc-300">Vuelve pronto para ver nuevas actividades</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden flex flex-col hover:border-[#1a56db]/40 transition-colors"
            >
              {/* Image or placeholder */}
              {event.image_url ? (
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div
                  className="w-full h-40 flex items-center justify-center"
                  style={{ background: "#1a56db" }}
                >
                  <Calendar className="size-10 text-white/40" />
                </div>
              )}

              <div className="flex flex-col gap-2 p-5 flex-1">
                {/* Sport + featured badge */}
                <div className="flex items-center gap-2">
                  {event.sport && (
                    <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
                      {SPORT_LABEL[event.sport] ?? event.sport}
                    </span>
                  )}
                  {event.is_featured && (
                    <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Destacado
                    </span>
                  )}
                </div>

                <h2 className="text-sm font-black text-[#0a0a0a] leading-tight">{event.title}</h2>

                {event.description && (
                  <p className="text-[11px] text-zinc-500 line-clamp-2">{event.description}</p>
                )}

                <div className="mt-auto pt-3 border-t border-[#f0f0f0] flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3 text-zinc-400 shrink-0" />
                    <span className="text-[11px] text-zinc-500 capitalize">
                      {formatDate(event.start_date)}
                    </span>
                  </div>
                  {(event.location || event.city) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3 text-zinc-400 shrink-0" />
                      <span className="text-[11px] text-zinc-500">
                        {[event.location, event.city].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
