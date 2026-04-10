export default function TournamentsLoading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* Header row */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-2.5 w-24 rounded-full bg-muted" />
          <div className="h-8 w-36 rounded-xl bg-muted" />
        </div>
        <div className="h-9 w-32 rounded-full bg-muted" />
      </div>

      {/* "Mis Torneos" section */}
      <section className="flex flex-col gap-3">
        <div className="h-2.5 w-20 rounded-full bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-muted h-36" />
          ))}
        </div>
      </section>

      {/* "Torneos Abiertos" section */}
      <section className="flex flex-col gap-3">
        <div className="h-2.5 w-28 rounded-full bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-muted h-44" />
          ))}
        </div>
      </section>
    </div>
  )
}
