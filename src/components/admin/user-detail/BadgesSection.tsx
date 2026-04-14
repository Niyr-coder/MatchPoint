"use client"

import { useState, useEffect, useCallback } from "react"
import { Medal } from "lucide-react"
import { BADGE_TYPES, BADGE_CONFIG } from "@/features/badges/constants"
import { formatDate } from "@/components/admin/user-detail/helpers"
import type { PlayerBadge } from "@/features/badges/types"
import type { ClubAdmin } from "@/lib/admin/queries"

interface BadgesSectionProps {
  userId: string
  clubs: ClubAdmin[]
}

export function BadgesSection({ userId, clubs }: BadgesSectionProps) {
  const [badges, setBadges] = useState<PlayerBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedType, setSelectedType] = useState<string>("")
  const [selectedClubId, setSelectedClubId] = useState<string>("")
  const [granting, setGranting] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const fetchBadges = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/badges`)
      const json = (await res.json()) as { success: boolean; data: PlayerBadge[] | null; error: string | null }
      if (!json.success) { setError(json.error ?? "Error al cargar insignias"); return }
      setBadges(json.data ?? [])
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { void fetchBadges() }, [fetchBadges])

  async function handleGrant() {
    if (!selectedType) return
    setGranting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/badges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          badge_type: selectedType,
          club_id: selectedClubId || undefined,
        }),
      })
      const json = (await res.json()) as { success: boolean; error: string | null }
      if (!json.success) { setError(json.error ?? "Error al otorgar"); return }
      setSelectedType("")
      setSelectedClubId("")
      await fetchBadges()
    } catch {
      setError("Error de conexión")
    } finally {
      setGranting(false)
    }
  }

  async function handleRevoke(badgeId: string) {
    setRevoking(badgeId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/badges/${badgeId}`, { method: "DELETE" })
      const json = (await res.json()) as { success: boolean; error: string | null }
      if (!json.success) { setError(json.error ?? "Error al revocar"); return }
      await fetchBadges()
    } catch {
      setError("Error de conexión")
    } finally {
      setRevoking(null)
    }
  }

  const selectedConfig = selectedType ? BADGE_CONFIG[selectedType as keyof typeof BADGE_CONFIG] : null
  const showClubSelect = selectedConfig?.canBeClubScoped ?? false

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Medal className="size-3.5 text-zinc-400 shrink-0" />
        <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">Insignias</p>
      </div>

      {loading ? (
        <p className="text-[11px] text-zinc-400">Cargando...</p>
      ) : badges.length > 0 ? (
        <div className="flex flex-col gap-2">
          {badges.map((badge) => {
            const cfg = BADGE_CONFIG[badge.badge_type]
            return (
              <div
                key={badge.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${cfg.color}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{cfg.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate">{cfg.label}</p>
                    <p className="text-[9px] opacity-70">
                      {badge.club_id ? (badge.club_name ?? "Club") : "Global"} · {formatDate(badge.granted_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void handleRevoke(badge.id)}
                  disabled={revoking === badge.id}
                  className="text-[9px] font-black uppercase tracking-wide text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 shrink-0 ml-2"
                >
                  {revoking === badge.id ? "…" : "Revocar"}
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-[11px] text-zinc-400">Sin insignias</p>
      )}

      <div className="rounded-xl border border-dashed border-border p-3 flex flex-col gap-2">
        <p className="text-[9px] font-black uppercase tracking-wide text-zinc-400">Otorgar insignia</p>

        <select
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value); setSelectedClubId("") }}
          className="w-full border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground bg-card outline-none focus:border-foreground"
        >
          <option value="">— Seleccionar insignia —</option>
          {BADGE_TYPES.map((type) => {
            const cfg = BADGE_CONFIG[type]
            return (
              <option key={type} value={type}>
                {cfg.emoji} {cfg.label}
              </option>
            )
          })}
        </select>

        {showClubSelect && (
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className="w-full border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground bg-card outline-none focus:border-foreground"
          >
            <option value="">— Global (sin club) —</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        )}

        {error && (
          <p className="text-[10px] text-red-600 bg-red-50 rounded-lg px-2 py-1.5 border border-red-100">{error}</p>
        )}

        <button
          onClick={() => void handleGrant()}
          disabled={!selectedType || granting}
          className="w-full bg-foreground text-white rounded-full py-2 text-[11px] font-bold hover:bg-foreground/90 transition-colors disabled:opacity-40"
        >
          {granting ? "Otorgando…" : "Otorgar insignia"}
        </button>
      </div>
    </div>
  )
}
