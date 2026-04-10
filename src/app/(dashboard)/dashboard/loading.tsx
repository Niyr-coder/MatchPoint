export default function UserDashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-2.5 w-20 rounded-full bg-muted" />
          <div className="h-8 w-48 rounded-xl bg-muted" />
        </div>
        <div className="h-9 w-32 rounded-full bg-muted" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted h-24" />
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted h-44" />
        ))}
      </div>
    </div>
  )
}
