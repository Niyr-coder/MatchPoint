import React from "react"
import type { QuedadaLeaderboardEntry } from "@/features/organizer/types"

interface Props {
  entries: QuedadaLeaderboardEntry[]
  quedadaName: string
  date: string
}

const MEDALS = ["🥇", "🥈", "🥉"] as const

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

export const QuedadaShareCard = React.forwardRef<HTMLDivElement, Props>(
  ({ entries, quedadaName, date }, ref) => {
    const totalMatches = entries.reduce((acc, e) => acc + e.matches_played, 0) / 2
    const podium = entries.slice(0, 3)
    const tableRows = entries.slice(0, 5)

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "360px",
          height: "640px",
          background: "#000000",
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 70%)",
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          display: "flex",
          flexDirection: "column",
          padding: "28px 24px 20px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Brand */}
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#10b981",
            marginBottom: "14px",
          }}
        >
          matchpoint.top
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "22px",
            fontWeight: 900,
            textTransform: "uppercase",
            color: "#ffffff",
            letterSpacing: "0.04em",
            lineHeight: 1.15,
            marginBottom: "6px",
          }}
        >
          {quedadaName}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "12px",
            color: "#6ee7b7",
            marginBottom: "24px",
            fontWeight: 500,
          }}
        >
          Resultados finales &middot; {Math.round(totalMatches)} partidos jugados
        </div>

        {/* Podium */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {([1, 0, 2] as const).map((rank) => {
            const entry = podium[rank]
            if (!entry) return null
            const isFirst = rank === 0
            const avatarSize = isFirst ? 52 : 40
            return (
              <div
                key={entry.player_id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  order: rank === 1 ? 1 : rank === 0 ? 2 : 3,
                }}
              >
                <div style={{ fontSize: isFirst ? "22px" : "18px" }}>{MEDALS[rank]}</div>
                <div
                  style={{
                    width: `${avatarSize}px`,
                    height: `${avatarSize}px`,
                    borderRadius: "50%",
                    background: isFirst ? "#065f46" : "#1f2937",
                    border: isFirst ? "2px solid #10b981" : "1.5px solid #374151",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isFirst ? "14px" : "12px",
                    fontWeight: 800,
                    color: "#ffffff",
                  }}
                >
                  {initials(entry.player_name)}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#ffffff",
                    maxWidth: "70px",
                    textAlign: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.player_name}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 900,
                    color: isFirst ? "#10b981" : "#6b7280",
                  }}
                >
                  {entry.win_pct.toFixed(0)}%
                </div>
                <div
                  style={{
                    height: isFirst ? "40px" : "28px",
                    width: isFirst ? "68px" : "56px",
                    background: isFirst ? "#064e3b" : "#111827",
                    borderRadius: "6px 6px 0 0",
                    marginTop: "2px",
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Table */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr 64px 48px",
              gap: "0",
              padding: "6px 10px",
              borderBottom: "1px solid #1f2937",
            }}
          >
            {["#", "Jugador", "Record", "%"].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#4b5563",
                  textAlign: h === "#" || h === "Jugador" ? "left" : "center",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {tableRows.map((entry, index) => (
            <div
              key={entry.player_id}
              style={{
                display: "grid",
                gridTemplateColumns: "24px 1fr 64px 48px",
                padding: "8px 10px",
                background: index % 2 === 0 ? "#0a0a0a" : "transparent",
                borderRadius: "4px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280" }}>
                {index + 1}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "#1f2937",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8px",
                    fontWeight: 800,
                    color: "#9ca3af",
                    flexShrink: 0,
                  }}
                >
                  {initials(entry.player_name)}
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#f9fafb",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.player_name}
                </span>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  textAlign: "center",
                  alignSelf: "center",
                }}
              >
                {entry.wins}–{entry.losses}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  color: entry.win_pct >= 50 ? "#10b981" : "#6b7280",
                  textAlign: "center",
                  alignSelf: "center",
                }}
              >
                {entry.win_pct.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid #1f2937",
          }}
        >
          <span style={{ fontSize: "10px", color: "#4b5563" }}>{date}</span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#10b981",
            }}
          >
            matchpoint.top
          </span>
        </div>
      </div>
    )
  }
)

QuedadaShareCard.displayName = "QuedadaShareCard"
