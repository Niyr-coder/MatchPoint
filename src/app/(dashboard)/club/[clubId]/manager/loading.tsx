export default function ManagerLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-zinc-100 h-28 w-full" />

      {/* Stats row — 3 cards (income, expense, balance) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-zinc-100 h-24" />
        ))}
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-zinc-100 h-44" />
        ))}
      </div>
    </div>
  )
}
