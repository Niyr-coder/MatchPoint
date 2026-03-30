"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Profile, AppRole } from "@/types"

const BANNER_BG: Record<AppRole, string> = {
  admin:    "#b91c1c",
  owner:    "#1e40af",
  partner:  "#0f766e",
  manager:  "#15803d",
  employee: "#3f3f46",
  coach:    "#92400e",
  user:     "#1a56db",
}

const ROLE_LABEL: Record<AppRole, string> = {
  admin:    "Plataforma Global",
  owner:    "Dueño del Club",
  partner:  "Socio del Club",
  manager:  "Vista Operativa",
  employee: "Vista Diaria",
  coach:    "Panel del Entrenador",
  user:     "Jugador",
}

interface StatItem {
  label: string
  value: string
}

interface RoleWelcomeBannerProps {
  profile: Profile
  role: AppRole
  date: string
  stats?: StatItem[]
  clubName?: string | null
}

export function RoleWelcomeBanner({
  profile,
  role,
  date,
  stats = [],
  clubName,
}: RoleWelcomeBannerProps) {
  const firstName = profile.first_name ?? "Usuario"
  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.full_name ||
    "Usuario"
  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("")

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl overflow-hidden p-6 md:p-8"
      style={{ background: BANNER_BG[role] }}
    >
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <Avatar className="size-16 shrink-0 ring-2 ring-white/40">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-white/20 text-white text-xl font-black">
            {initials || "U"}
          </AvatarFallback>
        </Avatar>

        {/* Name + date + club chip */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">
            {ROLE_LABEL[role]}
          </p>
          <h1
            className="font-black text-white uppercase leading-[0.9] tracking-[-0.03em] truncate"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}
          >
            Hola, {firstName}.
          </h1>
          <p className="mt-1.5 text-white/60 text-sm capitalize">{date}</p>
          {clubName && (
            <div className="mt-3">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                {clubName}
              </span>
            </div>
          )}
        </div>

        {/* Mini stats */}
        {stats.length > 0 && (
          <div className="flex gap-6 shrink-0 sm:border-l sm:border-white/20 sm:pl-6">
            {stats.map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-black text-white">{value}</p>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-wide mt-0.5">
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
