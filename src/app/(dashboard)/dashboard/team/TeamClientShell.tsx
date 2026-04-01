"use client"

import { useState } from "react"
import { TeamView } from "@/components/dashboard/TeamView"
import { TeamOnboarding } from "@/components/dashboard/TeamOnboarding"
import { DashboardHeading } from "@/components/dashboard/DashboardHeading"

interface TeamMember {
  id: string
  user_id: string
  role: "captain" | "member"
  profile: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  }
}

interface Team {
  id: string
  name: string
  sport: string
  description: string | null
  invite_code: string
  members: TeamMember[]
}

interface TeamClientShellProps {
  initialTeam: Team | null
  currentUserId: string
}

export function TeamClientShell({ initialTeam, currentUserId }: TeamClientShellProps) {
  const [team, setTeam] = useState<Team | null>(initialTeam)

  return (
    <div className="space-y-6">
      <DashboardHeading
        label="Mi espacio"
        title="Mi Team ❤️"
        subtitle={
          team
            ? `${team.members.length} miembro${team.members.length !== 1 ? "s" : ""}`
            : "Crea o únete a un team"
        }
      />

      {team ? (
        <TeamView
          team={team}
          currentUserId={currentUserId}
          onLeft={() => setTeam(null)}
        />
      ) : (
        <TeamOnboarding onJoined={(newTeam) => setTeam(newTeam)} />
      )}
    </div>
  )
}
