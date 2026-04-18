import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { JoinPageClient } from "../JoinPageClient"
import type { JoinPreview } from "../../join-preview"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))

const validPreview: JoinPreview = {
  code: "abc123",
  entity_type: "club",
  status: "valid",
  entity: {
    name: "Club Quito Norte",
    subtitle: "Quito",
    description: "Un club deportivo.",
    gradient: "linear-gradient(135deg, #1e3a5f, #0f172a)",
    cta_text: "Unirme al club",
    cta_sub: null,
    stats: [{ label: "Miembros", value: "248" }],
  },
}

describe("JoinPageClient", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders entity name and CTA when valid and authenticated", () => {
    render(<JoinPageClient preview={validPreview} isAuthenticated={true} />)
    expect(screen.getByText("Club Quito Norte")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /unirme al club/i })).toBeInTheDocument()
  })

  it("renders login CTA when not authenticated", () => {
    render(<JoinPageClient preview={validPreview} isAuthenticated={false} />)
    expect(screen.getByRole("link", { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it("login link includes next param pointing to the join page", () => {
    render(<JoinPageClient preview={validPreview} isAuthenticated={false} />)
    const link = screen.getByRole("link", { name: /iniciar sesión/i })
    expect(link).toHaveAttribute("href", "/login?next=/join/abc123")
  })

  it("renders expired message when status is expired", () => {
    render(
      <JoinPageClient
        preview={{ ...validPreview, status: "expired" }}
        isAuthenticated={true}
      />,
    )
    expect(screen.getByText(/expirado/i)).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("renders inactive message when status is inactive", () => {
    render(
      <JoinPageClient
        preview={{ ...validPreview, status: "inactive" }}
        isAuthenticated={true}
      />,
    )
    expect(screen.getByText(/desactivad/i)).toBeInTheDocument()
  })

  it("calls redeem API on CTA click and shows loading state", async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { entity_type: "club", entity_id: "club-1" } }),
    })

    render(<JoinPageClient preview={validPreview} isAuthenticated={true} />)
    await user.click(screen.getByRole("button", { name: /unirme al club/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/invites/redeem",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("shows success message after successful join", async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { entity_type: "club", entity_id: "club-1" } }),
    })

    render(<JoinPageClient preview={validPreview} isAuthenticated={true} />)
    await user.click(screen.getByRole("button", { name: /unirme al club/i }))

    expect(await screen.findByText(/te has unido/i)).toBeInTheDocument()
  })

  it("shows error message on failed join", async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "No autorizado" }),
    })

    render(<JoinPageClient preview={validPreview} isAuthenticated={true} />)
    await user.click(screen.getByRole("button", { name: /unirme al club/i }))

    expect(await screen.findByText(/no autorizado/i)).toBeInTheDocument()
  })
})
