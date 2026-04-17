import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { EventCardCTA } from "../components/EventCardCTA"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => { mockFetch.mockClear() })

describe("EventCardCTA", () => {
  it("shows Inscribirme when not registered and canRegister", () => {
    render(<EventCardCTA eventId="1" isRegistered={false} canRegister={true} isFull={false} />)
    expect(screen.getByRole("button", { name: /inscribirme/i })).toBeInTheDocument()
  })

  it("shows inscrito link when already registered", () => {
    render(<EventCardCTA eventId="1" isRegistered={true} canRegister={true} isFull={false} />)
    expect(screen.getByRole("link", { name: /ya estás inscrito/i })).toBeInTheDocument()
  })

  it("shows Sin lugares when isFull", () => {
    render(<EventCardCTA eventId="1" isRegistered={false} canRegister={false} isFull={true} />)
    expect(screen.getByText(/sin lugares/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /inscribirme/i })).not.toBeInTheDocument()
  })

  it("shows Registro cerrado when canRegister is false and not full", () => {
    render(<EventCardCTA eventId="1" isRegistered={false} canRegister={false} isFull={false} />)
    expect(screen.getByText(/registro cerrado/i)).toBeInTheDocument()
  })

  it("calls POST /api/events/:id/register on click", async () => {
    mockFetch.mockResolvedValueOnce({ json: async () => ({ success: true }) })
    render(<EventCardCTA eventId="evt-1" isRegistered={false} canRegister={true} isFull={false} />)
    await userEvent.click(screen.getByRole("button", { name: /inscribirme/i }))
    expect(mockFetch).toHaveBeenCalledWith("/api/events/evt-1/register", { method: "POST" })
  })

  it("shows error message on failed registration", async () => {
    mockFetch.mockResolvedValueOnce({ json: async () => ({ success: false, error: "Cupo lleno" }) })
    render(<EventCardCTA eventId="evt-1" isRegistered={false} canRegister={true} isFull={false} />)
    await userEvent.click(screen.getByRole("button", { name: /inscribirme/i }))
    expect(await screen.findByText(/cupo lleno/i)).toBeInTheDocument()
  })

  it("always renders the Info link", () => {
    render(<EventCardCTA eventId="evt-42" isRegistered={false} canRegister={true} isFull={false} />)
    expect(screen.getByRole("link", { name: /info/i })).toHaveAttribute("href", "/dashboard/events/evt-42")
  })
})
