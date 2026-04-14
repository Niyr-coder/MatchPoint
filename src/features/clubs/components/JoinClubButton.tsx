"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { joinClub } from "@/features/clubs/actions/join-club"

interface JoinClubButtonProps {
  clubId: string
  clubSlug: string
  initialIsMember: boolean
}

export function JoinClubButton({ clubId, clubSlug, initialIsMember }: JoinClubButtonProps) {
  const [isMember, setIsMember] = useState(initialIsMember)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (isMember) {
    return (
      <Link
        href={`/dashboard/clubs/${clubSlug}`}
        className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-wide border border-border rounded-full px-5 py-2.5 hover:bg-zinc-100 transition-colors"
      >
        Ver club →
      </Link>
    )
  }

  function handleJoin() {
    setError(null)
    startTransition(async () => {
      const result = await joinClub(clubId, clubSlug)
      if (result.success) {
        setIsMember(true)
      } else {
        setError(result.error ?? "Error al unirse")
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleJoin}
        disabled={isPending}
        className="bg-foreground text-white rounded-full px-5 py-2.5 text-sm font-black uppercase tracking-wide hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Uniéndose…" : "Unirse al club"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
