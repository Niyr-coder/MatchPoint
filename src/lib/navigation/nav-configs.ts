import type { NavSection } from "@/types"

export function getAdminNav(): NavSection[] {
  return [
    {
      items: [
        { label: "Dashboard Global", href: "/admin", icon: "LayoutDashboard" },
        { label: "Financiero", href: "/admin/financials", icon: "DollarSign" },
        { label: "Clubs", href: "/admin/clubs", icon: "Building2" },
        { label: "Usuarios", href: "/admin/users", icon: "Users" },
        { label: "Torneos", href: "/admin/tournaments", icon: "Trophy" },
        { label: "Moderación", href: "/admin/moderation", icon: "Shield" },
        { label: "Analytics", href: "/admin/analytics", icon: "BarChart3" },
        { label: "Chat", href: "/admin/chat", icon: "MessageSquare" },
        { label: "Shop", href: "/admin/shop", icon: "ShoppingBag" },
        { label: "Configuración", href: "/admin/settings", icon: "Settings" },
      ],
    },
  ]
}

export function getOwnerNav(clubId: string): NavSection[] {
  const base = `/club/${clubId}/owner`
  return [
    {
      items: [
        { label: "Dashboard", href: base, icon: "LayoutDashboard" },
        { label: "Financiero", href: `${base}/financials`, icon: "DollarSign" },
        { label: "Canchas", href: `${base}/courts`, icon: "MapPin" },
        { label: "Equipo", href: `${base}/team`, icon: "Users" },
        { label: "Entrenadores", href: `${base}/coaches`, icon: "UserCheck" },
        { label: "Torneos", href: `${base}/tournaments`, icon: "Trophy" },
        { label: "Reservas", href: `${base}/reservations`, icon: "Calendar" },
        { label: "Membresías", href: `${base}/memberships`, icon: "CreditCard" },
        { label: "Reportes", href: `${base}/reports`, icon: "FileBarChart" },
        { label: "Configuración", href: `${base}/settings`, icon: "Settings" },
      ],
    },
  ]
}

export function getPartnerNav(clubId: string): NavSection[] {
  const base = `/club/${clubId}/partner`
  return [
    {
      items: [
        { label: "Dashboard", href: base, icon: "LayoutDashboard" },
        { label: "Mi Financiero", href: `${base}/financials`, icon: "DollarSign" },
        { label: "Mis Torneos", href: `${base}/tournaments`, icon: "Trophy" },
        { label: "Reportes", href: `${base}/reports`, icon: "FileBarChart" },
      ],
    },
  ]
}

export function getManagerNav(clubId: string): NavSection[] {
  const base = `/club/${clubId}/manager`
  return [
    {
      items: [
        { label: "Hoy", href: base, icon: "Sun" },
        { label: "Canchas", href: `${base}/courts`, icon: "MapPin" },
        { label: "Entrenadores", href: `${base}/coaches`, icon: "UserCheck" },
        { label: "Reservas", href: `${base}/reservations`, icon: "Calendar" },
        { label: "Clientes", href: `${base}/clients`, icon: "Users" },
        { label: "Caja", href: `${base}/cash-register`, icon: "Wallet" },
        { label: "Reportes", href: `${base}/reports`, icon: "FileBarChart" },
        { label: "Mensajes", href: `${base}/messages`, icon: "MessageSquare" },
      ],
    },
  ]
}

export function getEmployeeNav(clubId: string): NavSection[] {
  const base = `/club/${clubId}/employee`
  return [
    {
      items: [
        { label: "Hoy", href: base, icon: "Sun" },
        { label: "Reservas", href: `${base}/reservations`, icon: "Calendar" },
        { label: "Clientes", href: `${base}/clients`, icon: "Users" },
        { label: "Entrenadores", href: `${base}/coaches`, icon: "UserCheck" },
        { label: "Caja", href: `${base}/cash-register`, icon: "Wallet" },
        { label: "Reporte Diario", href: `${base}/daily-report`, icon: "FileText" },
      ],
    },
  ]
}

export function getCoachNav(clubId: string): NavSection[] {
  const base = `/club/${clubId}/coach`
  return [
    {
      items: [
        { label: "Mis Clases", href: base, icon: "BookOpen" },
        { label: "Mis Estudiantes", href: `${base}/students`, icon: "Users" },
        { label: "Mi Perfil", href: `${base}/profile`, icon: "User" },
        { label: "Mis Ganancias", href: `${base}/earnings`, icon: "DollarSign" },
        { label: "Mis Torneos", href: `${base}/tournaments`, icon: "Trophy" },
        { label: "Mensajes", href: `${base}/messages`, icon: "MessageSquare" },
      ],
    },
  ]
}

export function getUserNav(): NavSection[] {
  return [
    {
      items: [
        { label: "Inicio", href: "/dashboard", icon: "Home" },
        { label: "Clubes", href: "/dashboard/clubs", icon: "Building2" },
        { label: "Ranking", href: "/dashboard/ranking", icon: "Trophy" },
        { label: "Eventos", href: "/dashboard/events", icon: "CalendarDays" },
        { label: "Chat", href: "/dashboard/chat", icon: "MessageSquare" },
        { label: "Shop", href: "/dashboard/shop", icon: "ShoppingBag" },
        { label: "Mi Team ❤️", href: "/dashboard/team", icon: "Users" },
        { label: "Solicitar club", href: "/dashboard/request-club", icon: "PlusCircle" },
      ],
    },
  ]
}
