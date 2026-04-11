import { Suspense } from "react"
import Link from "next/link"
import { authorizeOrRedirect } from "@/features/auth/queries"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { EventCard } from "@/features/activities/components/EventCard"
import { EventsFilters } from "@/features/activities/components/EventsFilters"
import { CalendarDays } from "lucide-react"
import type { EventWithClub } from "@/features/activities/types"
import { mapEventRow } from "@/features/activities/utils"

const PAGE_SIZE = 12

interface SearchParams {
  sport?: string
  event_type?: string
  city?: string
  is_free?: string
  search?: string
  page?: string
  tab?: string
}

async function fetchEvents(
  params: SearchParams,
  userId: string,
): Promise<{ events: EventWithClub[]; total: number }> {
  const supabase = await createClient()

  const page    = Math.max(0, parseInt(params.page ?? "0", 10))
  const tab     = params.tab ?? "all"
  const isFree  = params.is_free === "true"

  let query = supabase
    .from("events")
    .select(
      `
      id, title, description, sport, event_type, status,
      club_id, city, location, start_date, end_date,
      image_url, is_free, price, max_capacity, min_participants,
      visibility, registration_deadline, tags,
      organizer_name, organizer_contact, created_at,
      clubs ( name ),
      event_registrations ( count )
      `,
      { count: "exact" },
    )
    .eq("status", "published")
    .eq("visibility", "public")
    .order("start_date", { ascending: true })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (params.sport)      query = query.eq("sport", params.sport)
  if (params.event_type) query = query.eq("event_type", params.event_type)
  if (params.city)       query = query.ilike("city", `%${params.city}%`)
  if (isFree)            query = query.eq("is_free", true)
  if (params.search)     query = query.ilike("title", `%${params.search}%`)

  if (tab === "mine") {
    const { data: regs } = await supabase
      .from("event_registrations")
      .select("event_id")
      .eq("user_id", userId)
    const ids = (regs ?? []).map((r: { event_id: string }) => r.event_id)
    if (ids.length === 0) return { events: [], total: 0 }
    query = query.in("id", ids)
  }

  const { data, error, count } = await query

  if (error) throw new Error(error.message)

  const events: EventWithClub[] = (data ?? []).map(mapEventRow)

  return { events, total: count ?? 0 }
}

interface EventsPageProps {
  searchParams: Promise<SearchParams>
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const { userId } = await authorizeOrRedirect()
  const params = await searchParams
  const tab    = params.tab ?? "all"

  const { events, total } = await fetchEvents(params, userId)
  const page = Math.max(0, parseInt(params.page ?? "0", 10))

  const buildHref = (newParams: Record<string, string>) => {
    const merged = { ...params, ...newParams }
    const qs = new URLSearchParams(
      Object.entries(merged).filter(([, v]) => Boolean(v)),
    ).toString()
    return `/dashboard/events${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Plataforma · Comunidad"
        title="Eventos"
        description="Clínicas, quedadas, workshops y más actividades de tu comunidad"
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "all",  label: "Todos" },
          { key: "mine", label: "Mis registraciones" },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={buildHref({ tab: key, page: "0" })}
            className={`px-4 py-2.5 text-sm font-black uppercase tracking-wide transition-colors border-b-2 -mb-px ${
              tab === key
                ? "border-foreground text-foreground"
                : "border-transparent text-zinc-400 hover:text-zinc-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Filters — wrapped in Suspense because it uses useSearchParams internally */}
      <Suspense>
        <EventsFilters />
      </Suspense>

      {/* Results count */}
      {total > 0 && (
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
          {total} evento{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Grid */}
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={tab === "mine" ? "No te has registrado a ningún evento" : "No hay eventos disponibles"}
          description={
            tab === "mine"
              ? "Explora los eventos disponibles y regístrate para verlos aquí."
              : "Prueba ajustar los filtros o vuelve más tarde."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              title={event.title}
              description={event.description}
              sport={event.sport}
              event_type={event.event_type}
              city={event.city}
              location={event.location}
              start_date={event.start_date}
              image_url={event.image_url}
              is_free={event.is_free}
              price={event.price}
              max_capacity={event.max_capacity}
              registration_count={event.registration_count}
              club_name={event.club_name}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex justify-center gap-2">
          {page > 0 && (
            <Link
              href={buildHref({ page: String(page - 1) })}
              className="border border-border rounded-full px-5 py-2 text-sm font-bold text-zinc-600 hover:bg-secondary transition-colors"
            >
              Anterior
            </Link>
          )}
          {(page + 1) * PAGE_SIZE < total && (
            <Link
              href={buildHref({ page: String(page + 1) })}
              className="bg-foreground text-white rounded-full px-5 py-2 text-sm font-bold hover:bg-foreground/90 transition-colors"
            >
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
