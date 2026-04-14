import Link from "next/link"
import { MessageCircle, ShoppingBag, CalendarDays } from "lucide-react"

interface ClubMemberSectionsProps {
  clubSlug: string
  clubId: string
}

export function ClubMemberSections({ clubSlug, clubId }: ClubMemberSectionsProps) {
  const links = [
    {
      href: `/dashboard/chat?clubId=${clubId}`,
      icon: MessageCircle,
      label: "Chat del club",
      description: "Mensajes con miembros y staff",
    },
    {
      href: `/dashboard/clubs/${clubSlug}/shop`,
      icon: ShoppingBag,
      label: "Tienda",
      description: "Productos y equipamiento del club",
    },
    {
      href: `/dashboard/reservations?clubId=${clubId}`,
      icon: CalendarDays,
      label: "Mis reservas",
      description: "Historial de reservas en este club",
    },
  ]

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-foreground">Área de miembros</h2>
      <div className="flex flex-col gap-2">
        {links.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-foreground/40 transition-colors"
          >
            <Icon className="size-5 text-zinc-400 shrink-0" />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-bold text-foreground">{label}</span>
              <span className="text-[11px] text-zinc-500">{description}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
