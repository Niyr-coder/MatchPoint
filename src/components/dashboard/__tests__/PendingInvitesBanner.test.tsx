import { render, screen } from "@testing-library/react"
import { PendingInvitesBanner } from "../PendingInvitesBanner"
import type { ReservationInvite } from "@/features/bookings/types"

const base: ReservationInvite = {
  id: "inv-1",
  reservation_id: "res-1",
  invited_user_id: "user-1",
  status: "pending",
  created_at: "2026-04-17T10:00:00Z",
  reservations: {
    id: "res-1",
    court_id: "court-1",
    user_id: "host-1",
    date: "2026-04-25",
    start_time: "08:00:00",
    end_time: "09:00:00",
    status: "confirmed",
    total_price: 20,
    notes: null,
    created_at: "2026-04-17T10:00:00Z",
    updated_at: "2026-04-17T10:00:00Z",
  },
}

describe("PendingInvitesBanner", () => {
  it("renders nothing when invites is empty", () => {
    const { container } = render(<PendingInvitesBanner invites={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders singular text for one invite", () => {
    render(<PendingInvitesBanner invites={[base]} />)
    expect(screen.getByText(/1 invitación pendiente/i)).toBeInTheDocument()
  })

  it("renders plural text for multiple invites", () => {
    render(<PendingInvitesBanner invites={[base, { ...base, id: "inv-2" }]} />)
    expect(screen.getByText(/2 invitaciones pendientes/i)).toBeInTheDocument()
  })

  it("links to the reservations page", () => {
    render(<PendingInvitesBanner invites={[base]} />)
    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard/reservations")
  })
})
