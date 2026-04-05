import { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "@/components/shared/LoginForm"
import { CheckCircle2 } from "lucide-react"
import { SITE_NAME } from "@/lib/constants"

export const metadata: Metadata = {
  title: `Iniciar Sesión — ${SITE_NAME}`,
  description: "Accede a tu cuenta de MATCHPOINT y encuentra tu próximo partido.",
}

const BENEFITS = [
  {
    title: "Encuentra partidos al instante",
    description: "Conecta con jugadores de tu nivel en Pickleball, Pádel, Tenis y Fútbol.",
  },
  {
    title: "Reserva pistas sin llamadas",
    description: "Gestiona reservas en segundos desde la app. Sin esperas, sin llamadas.",
  },
  {
    title: "Tu historial deportivo",
    description: "Registra tus partidos, estadísticas y rivales favoritos en un solo lugar.",
  },
  {
    title: "Comunidad de +500 deportistas",
    description: "Únete a la red deportiva que está creciendo en tu ciudad.",
  },
]

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left — Benefits panel */}
      <div className="hidden lg:flex lg:w-1/2 section-dark flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(22,163,74,0.18),transparent_55%)] pointer-events-none" />

        <div className="relative z-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-white">
            <span className="text-[#16a34a]">●</span>
            {SITE_NAME}
          </Link>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-16">
          <p className="label-green mb-2">Por qué unirte</p>

          <h2
            className="font-black text-white uppercase leading-[0.9] tracking-[-0.03em] mb-10"
            style={{ fontSize: "clamp(2.5rem, 4vw, 3.5rem)" }}
          >
            Todo el deporte.<br />
            En una sola app.
          </h2>

          <ul className="space-y-6">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className="flex gap-4">
                <CheckCircle2 className="w-5 h-5 text-[#16a34a] shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm leading-snug">{benefit.title}</p>
                  <p className="text-white/45 text-sm mt-0.5 leading-relaxed">{benefit.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom social proof */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["🏓", "🎾", "🏸", "⚽"].map((emoji, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-white/10 border-2 border-[#0a0a0a] flex items-center justify-center text-sm"
                >
                  {emoji}
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40">
              <span className="text-white font-semibold">+500</span> deportistas ya registrados
            </p>
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white">
        {/* Mobile logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e5e5e5] lg:hidden">
          <Link href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-[#0a0a0a]">
            <span className="text-[#16a34a]">●</span>
            {SITE_NAME}
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>

        <div className="px-6 py-5 text-center lg:hidden border-t border-[#e5e5e5]">
          <p className="text-xs text-[#737373]">
            ¿No tienes cuenta?{" "}
            <a href="/#waitlist" className="text-[#16a34a] font-semibold hover:underline">
              Únete gratis
            </a>
          </p>
        </div>

        <div className="hidden lg:flex px-12 py-6 border-t border-[#e5e5e5] justify-between items-center">
          <p className="text-xs text-[#737373]">
            ¿No tienes cuenta?{" "}
            <a href="/#waitlist" className="text-[#16a34a] font-semibold hover:underline">
              Únete gratis
            </a>
          </p>
          <p className="text-xs text-[#c0c0c0]">© 2025 {SITE_NAME}</p>
        </div>
      </div>
    </div>
  )
}
