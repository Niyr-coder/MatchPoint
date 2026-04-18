import { render, screen } from "@testing-library/react"
import { ClubActivityFeed } from "../ClubActivityFeed"
import type { ActivityItem } from "@/features/clubs/club-activity"

const items: ActivityItem[] = [
  {
    type: "tournament_opened",
    title: 'Torneo "Pádel Amateur" abierto',
    subtitle: "Club Norte",
    timestamp: "2026-04-17T10:00:00Z",
    color: "#10b981",
  },
  {
    type: "new_member",
    title: "Ana López se unió al club",
    subtitle: "Club Norte",
    timestamp: "2026-04-17T09:00:00Z",
    color: "#6366f1",
  },
]

describe("ClubActivityFeed", () => {
  it("renders nothing when items is empty", () => {
    const { container } = render(<ClubActivityFeed items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders all activity items", () => {
    render(<ClubActivityFeed items={items} />)
    expect(screen.getByText('Torneo "Pádel Amateur" abierto')).toBeInTheDocument()
    expect(screen.getByText("Ana López se unió al club")).toBeInTheDocument()
  })

  it("renders subtitles", () => {
    render(<ClubActivityFeed items={items} />)
    expect(screen.getAllByText("Club Norte")).toHaveLength(2)
  })

  it("renders section heading", () => {
    render(<ClubActivityFeed items={items} />)
    expect(screen.getByText(/actividad del club/i)).toBeInTheDocument()
  })
})
