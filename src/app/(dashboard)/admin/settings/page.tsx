import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import {
  Settings,
  Building2,
  Users,
  Trophy,
  DollarSign,
  Shield,
  BarChart3,
  Database,
  Lock,
  HardDrive,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"

const SPORTS = [
  {
    name: "Fútbol 7",
    modalities: ["5 vs 5", "7 vs 7", "Mixto"],
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    name: "Pádel",
    modalities: ["Individual", "Dobles", "Mixto"],
    color: "bg-violet-50 text-violet-700",
  },
  {
    name: "Tenis",
    modalities: ["Individual", "Dobles", "Mixto"],
    color: "bg-yellow-50 text-yellow-700",
  },
  {
    name: "Pickleball",
    modalities: ["Individual", "Dobles", "Mixto"],
    color: "bg-orange-50 text-orange-700",
  },
]

const QUICK_LINKS = [
  { label: "Gestión de Clubs", href: "/admin/clubs", icon: Building2, desc: "Ver y administrar todos los clubs" },
  { label: "Gestión de Usuarios", href: "/admin/users", icon: Users, desc: "Ver y administrar usuarios globales" },
  { label: "Torneos", href: "/admin/tournaments", icon: Trophy, desc: "Supervisar torneos en la plataforma" },
  { label: "Financiero", href: "/admin/financials", icon: DollarSign, desc: "Ingresos y movimientos financieros" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, desc: "Estadísticas y tendencias globales" },
  { label: "Moderación", href: "/admin/moderation", icon: Shield, desc: "Revisar usuarios y clubs pendientes" },
]

const STATUS_SERVICES = [
  { label: "Base de datos", icon: Database },
  { label: "Autenticación", icon: Lock },
  { label: "Almacenamiento", icon: HardDrive },
]

export default async function AdminSettingsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const env = process.env.NODE_ENV ?? "production"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · CONFIG"
        title="Configuración del Sistema"
        description="Información de la plataforma y accesos rápidos de administración"
      />

      {/* Platform info card */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-xl bg-[#dc2626]/10 flex items-center justify-center">
            <Settings className="size-5 text-[#dc2626]" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Información de plataforma
            </p>
            <p className="text-lg font-black text-[#0a0a0a] leading-none mt-0.5">MATCHPOINT</p>
          </div>
          <span className="ml-auto text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            Operativo
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#f0f0f0]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
              Versión
            </p>
            <p className="text-sm font-black text-[#0a0a0a]">1.0.0 Beta</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
              Entorno
            </p>
            <p className="text-sm font-black text-[#0a0a0a] capitalize">{env}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
              Región
            </p>
            <p className="text-sm font-black text-[#0a0a0a]">Ecuador</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
              Moneda
            </p>
            <p className="text-sm font-black text-[#0a0a0a]">USD ($)</p>
          </div>
        </div>
      </div>

      {/* Sports & modalities */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">
          Deportes configurados
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SPORTS.map((sport) => (
            <div key={sport.name} className="rounded-xl border border-[#f0f0f0] p-4">
              <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${sport.color}`}>
                {sport.name}
              </span>
              <div className="mt-3 flex flex-col gap-1">
                {sport.modalities.map((mod) => (
                  <p key={mod} className="text-[11px] text-zinc-500 font-medium">
                    · {mod}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">
          Accesos rápidos
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-xl border border-[#f0f0f0] p-4 hover:border-[#e5e5e5] hover:bg-zinc-50 transition-colors group"
            >
              <div className="size-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-[#dc2626]/10 transition-colors">
                <link.icon className="size-4 text-zinc-500 group-hover:text-[#dc2626] transition-colors" />
              </div>
              <div>
                <p className="text-sm font-black text-[#0a0a0a]">{link.label}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Platform status */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">
          Estado de los servicios
        </p>
        <div className="flex flex-col divide-y divide-[#f0f0f0]">
          {STATUS_SERVICES.map((svc) => (
            <div key={svc.label} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <svc.icon className="size-4 text-zinc-400" />
                <p className="text-sm font-bold text-[#0a0a0a]">{svc.label}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-[#16a34a]">
                <CheckCircle2 className="size-3.5" />
                Operativo
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
