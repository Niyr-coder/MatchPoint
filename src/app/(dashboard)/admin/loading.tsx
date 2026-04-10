export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-muted h-28 w-full" />

      {/* Stats row — 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted h-24" />
        ))}
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted h-44" />
        ))}
      </div>
    </div>
  )
}
