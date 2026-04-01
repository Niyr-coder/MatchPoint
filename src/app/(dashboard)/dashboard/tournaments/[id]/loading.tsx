export default function TournamentDetailLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-24 rounded-full bg-zinc-100" />

      {/* Tournament header card */}
      <div className="rounded-2xl border border-[#e5e5e5] p-6 flex flex-col gap-4">
        {/* Status badge + date */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-20 rounded-full bg-zinc-100" />
          <div className="h-4 w-28 rounded-full bg-zinc-100" />
        </div>

        {/* Title */}
        <div className="h-8 w-2/3 rounded-xl bg-zinc-100" />

        {/* Description lines */}
        <div className="flex flex-col gap-2">
          <div className="h-3.5 w-full rounded-full bg-zinc-100" />
          <div className="h-3.5 w-4/5 rounded-full bg-zinc-100" />
        </div>

        {/* Meta row — sport / venue / fee */}
        <div className="flex items-center gap-4 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-20 rounded-full bg-zinc-100" />
          ))}
        </div>

        {/* CTA button */}
        <div className="h-10 w-40 rounded-full bg-zinc-100 mt-2" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-[#e5e5e5] pb-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-lg bg-zinc-100" />
        ))}
      </div>

      {/* Tab content — bracket or participants table */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-zinc-100" />
        ))}
      </div>
    </div>
  )
}
