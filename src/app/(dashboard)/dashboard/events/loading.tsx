import { EventCardSkeleton } from "@/features/activities/components/EventCardSkeleton"

export default function EventsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="h-3 w-32 bg-muted rounded animate-pulse" />
        <div className="h-7 w-48 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
