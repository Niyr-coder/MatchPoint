export default function EventDetailLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-3 w-32 bg-muted rounded" />
      <div className="h-64 bg-muted rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="h-7 w-2/3 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-4/5 bg-muted rounded" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-10 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  )
}
