import type { NavSection } from "@/types"

export function getAdminNav(): NavSection[] {
  return [
    {
      title: "General",
      items: [
        { label: "Dashboard Global", href: "/admin", icon: "LayoutDashboard" },
        { label: "Financiero", href: "/admin/financials", icon: "DollarSign" },
        { label: "Analytics", href: "/admin/analytics", icon: "BarChart3" },
      ],
    },
    {
      title: "Gestión",
      items: [
        { label: "Clubs", href: "/admin/clubs", icon: "Building2" },
        { label: "Usuarios", href: "/admin/users", icon: "Users" },
        { label: "Torneos", href: "/admin/tournaments", icon: "Trophy" },
        { label: "Eventos", href: "/admin/events", icon: "CalendarDays" },
        { label: "Moderación", href: "/admin/moderation", icon: "Shield" },
        { label: "Invitaciones", href: "/admin/invites", icon: "Link2" },
        { label: "Reservas", href: "/admin/reservations", icon: "CalendarCheck" },
      ],
    },
    {
      title: "Herramientas",
      items: [
        { label: "Chat", href: "/admin/chat", icon: "MessageSquare" },
        { label: "Shop", href: "/admin/shop", icon: "ShoppingBag" },
        { label: "Configuración", href: "/admin/settings", icon: "Settings" },
        { label: "Auditoría", href: "/admin/audit", icon: "Shield" },
      ],
    },
  ]
}

export function getOwnerNav(clubId: string): NavSection[] {
  const base = `/club/${clubId}/owner`
  return [
    {
      title: "General",
      items: [
        { label: "Dashboard", href: base, icon: "LayoutDashboard" },
        { label: "Financiero", href: `${base}/financials`, icon: "DollarSign" },
      ],
    },
    {
      title: "Operaciones",
      items: [
        { label: "Canchas", href: `${base}/courts`, icon: "MapPin" },
        { label: "Reservas", href: `${base}/reservations`, icon: "Calendar" },
        { label: "Eventos", href: `${base}/events`, icon: "CalendarDays" },
        { label: "Torneos", href: `${base}/tournaments`, icon: "Trophy" },
      ],
    },
    {
      title: "Club",
      items: [
        { label: "Equipo", href: `${base}/team`, icon: "Users" },
        { label: "Entrenadores", href: `${base}/coaches`, icon: "UserCheck" },
        { label: "Membresías", href: `${base}/memberships`, icon: "CreditCard" },
        { label: "Mensajes", href: `${base}/messages`, icon: "MessageSquare" },
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
      title: "Socio",
      items: [
        { label: "Dashboard", href: base, icon: "LayoutDashboard" },
        { label: "Mi Financiero", href: `${base}/financials`, icon: "DollarSign" },
        { label: "Mis Torneos", href: `${base}/tournaments`, icon: "Trophy" },
        { label: "Reportes", href: `${base}/reports`, icon: "FileBarChart" },
        { label: "Mensajes", href: `${base}/messages`, icon: "MessageSquare" },
      ],
    },
  ]
}

export function getManagerNav(clubId: string): NavSection[] {
  const base = `/club/${clubId}/manager`
  return [
    {
      title: "Operaciones",
      items: [
        { label: "Hoy", href: base, icon: "Sun" },
        { label: "Canchas", href: `${base}/courts`, icon: "MapPin" },
        { label: "Reservas", href: `${base}/reservations`, icon: "Calendar" },
        { label: "Eventos", href: `${base}/events`, icon: "CalendarDays" },
        { label: "Caja", href: `${base}/cash-register`, icon: "Wallet" },
      ],
    },
    {
      title: "Personas",
      items: [
        { label: "Entrenadores", href: `${base}/coaches`, icon: "UserCheck" },
        { label: "Clientes", href: `${base}/clients`, icon: "Users" },
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
      title: "Operaciones",
      items: [
        { label: "Hoy", href: base, icon: "Sun" },
        { label: "Reservas", href: `${base}/reservations`, icon: "Calendar" },
        { label: "Clientes", href: `${base}/clients`, icon: "Users" },
        { label: "Entrenadores", href: `${base}/coaches`, icon: "UserCheck" },
        { label: "Caja", href: `${base}/cash-register`, icon: "Wallet" },
        { label: "Mensajes", href: `${base}/messages`, icon: "MessageSquare" },
        { label: "Reporte Diario", href: `${base}/daily-report`, icon: "FileText" },
      ],
    },
  ]
}

export function getCoachNav(clubId: string): NavSection[] {
  const base = `/club/${clubId}/coach`
  return [
    {
      title: "Mi Trabajo",
      items: [
        { label: "Mis Clases", href: base, icon: "BookOpen" },
        { label: "Mis Estudiantes", href: `${base}/students`, icon: "Users" },
        { label: "Mi Perfil", href: `${base}/profile`, icon: "User" },
      ],
    },
    {
      title: "Extra",
      items: [
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
      title: "Explorar",
      items: [
        { label: "Inicio", href: "/dashboard", icon: "Home" },
        { label: "Clubes", href: "/dashboard/clubs", icon: "Building2" },
        { label: "Ranking", href: "/dashboard/ranking", icon: "Trophy" },
        { label: "Eventos", href: "/dashboard/events", icon: "CalendarDays" },
      ],
    },
    {
      title: "Mi Cuenta",
      items: [
        { label: "Chat", href: "/dashboard/chat", icon: "MessageSquare" },
        { label: "Shop", href: "/dashboard/shop", icon: "ShoppingBag" },
        { label: "Mi Team", href: "/dashboard/team", icon: "Users" },
        { label: "Solicitar club", href: "/dashboard/request-club", icon: "PlusCircle" },
      ],
    },
  ]
}
