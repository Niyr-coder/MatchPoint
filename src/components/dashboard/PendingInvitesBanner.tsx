"use client"

import Link from "next/link"
import type { ReservationInvite } from "@/features/bookings/types"

interface PendingInvitesBannerProps {
  invites: ReservationInvite[]
}

export function PendingInvitesBanner({ invites }: PendingInvitesBannerProps) {
  if (invites.length === 0) return null

  const count = invites.length
  const label =
    count === 1
      ? "1 invitación pendiente a una reserva"
      : `${count} invitaciones pendientes a reservas`

  return (
    <Link
      href="/dashboard/reservations"
      className="flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3.5 hover:bg-slate-800 transition-colors"
    >
      <span className="size-2 rounded-full bg-amber-400 shrink-0" />
      <p className="text-sm font-semibold text-white flex-1">{label}</p>
      <span className="text-xs text-slate-400 shrink-0">Ver →</span>
    </Link>
  )
}
