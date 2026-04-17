export function EventCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="h-44 bg-muted" />
      <div className="p-4 flex flex-col gap-2.5">
        <div className="flex gap-1.5">
          <div className="h-4 w-14 bg-muted rounded-full" />
          <div className="h-4 w-12 bg-muted rounded-full" />
        </div>
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-3.5 w-full bg-muted rounded" />
        <div className="flex gap-1.5 items-center">
          <div className="size-[18px] rounded-full bg-muted" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
        <div className="flex gap-1">
          <div className="h-3.5 w-16 bg-muted rounded" />
          <div className="h-3.5 w-12 bg-muted rounded" />
        </div>
        <div className="pt-2 border-t border-border flex flex-col gap-1.5">
          <div className="h-3 w-40 bg-muted rounded" />
          <div className="h-3 w-28 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-1 w-full bg-muted rounded-full mt-0.5" />
        </div>
        <div className="h-8 w-full bg-muted rounded-full mt-1" />
      </div>
    </div>
  )
}
