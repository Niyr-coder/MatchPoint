// ============================================================
// Shared / UI types — not domain-specific
// ============================================================

export interface SportCategory {
  id: string
  name: string
  emoji: string
  description: string
  players: string
  gradient: string
  image: string
  stat?: string
}

export interface Testimonial {
  quote: string
  name: string
  sport: string
  city: string
  emoji: string
}

export interface Feature {
  icon: string
  title: string
  description: string
}

export interface Stat {
  value: number
  suffix: string
  label: string
}

export interface NavLink {
  label: string
  href: string
}

export interface FooterColumn {
  title: string
  links: { label: string; href: string }[]
}

export interface WaitlistEntry {
  email: string
  source?: string
}

export interface ApiResponse<T = null> {
  success: boolean
  data: T | null
  error: string | null
}

// ============================================================
// Navigation & Dashboard
// ============================================================

export interface NavItem {
  label: string
  href: string
  icon: string
  permission?: import("@/features/auth/types").AppPermission
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

// ============================================================
// Sports — kept here as a shared primitive
// ============================================================

export type SportId = "pickleball" | "padel" | "tenis" | "futbol"

// ============================================================
// Re-exports from features (transitional — for backwards compatibility)
// ============================================================

export * from "@/features/auth/types"
export * from "@/features/users/types"
export * from "@/features/clubs/types"
export * from "@/features/memberships/types"
export * from "@/features/notifications/types"
