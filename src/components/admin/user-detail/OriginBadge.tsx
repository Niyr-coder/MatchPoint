const ORIGIN_LABELS: Record<string, string> = {
  email:         "Email",
  google:        "Google",
  admin_created: "Admin",
  invite:        "Invitación",
}

function originLabel(origin: string | null): string {
  if (!origin) return "Email"
  return ORIGIN_LABELS[origin] ?? origin
}

export function OriginBadge({ origin }: { origin: string | null }) {
  const label = originLabel(origin)
  const colorClass =
    origin === "google"
      ? "bg-card text-foreground border-border"
      : origin === "admin_created"
      ? "bg-purple-50 text-purple-700 border-purple-100"
      : origin === "invite"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-secondary text-zinc-600 border-border"

  return (
    <span
      className={`inline-flex items-center text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${colorClass}`}
    >
      {label}
    </span>
  )
}
