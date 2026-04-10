export default function CoachLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-muted h-28 w-full" />

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted h-44" />
        ))}
      </div>
    </div>
  )
}
