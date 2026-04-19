import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import { Users, Zap, TrendingUp, Trophy } from "lucide-react"
import { LoginForm } from "@/components/shared/LoginForm"
import { SITE_NAME } from "@/lib/constants"

export const metadata: Metadata = {
  title: `Iniciar Sesión — ${SITE_NAME}`,
  description: "Accede a tu cuenta de MATCHPOINT y encuentra tu próximo partido.",
}

const BENEFITS = [
  { icon: Users, title: "Rivales de tu nivel", desc: "El sistema te conecta con jugadores que te van a exigir." },
  { icon: Zap, title: "Reserva en 30 segundos", desc: "Sin llamadas, sin WhatsApps. Cancha, horario, listo." },
  { icon: TrendingUp, title: "Tu ranking sube", desc: "Cada partido cuenta. La comunidad ve tu progreso." },
  { icon: Trophy, title: "Torneos locales", desc: "Compite en tu ciudad desde amateurs hasta ligas." },
]

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left — Hero panel */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-black flex-col justify-between">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/55 z-10" />
          <Image
            src="/images/landing/hero.png"
            alt="Sports Complex"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Fallback gradient */}
        <div className="absolute inset-0 z-[1]" style={{
          background: "linear-gradient(135deg, #064e3b 0%, #0a0a0a 40%, #000 100%)",
        }} />
        <div className="absolute inset-0 bg-black/55 z-[2]" />
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent z-[3]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(16,185,129,0.18),transparent_60%)] z-[4]" />

        {/* Top — logo */}
        <div className="relative z-20 p-12">
          <Link href="/" className="flex items-center gap-1.5 font-black text-[22px] tracking-[-0.03em] text-white">
            <span className="text-primary text-[22px]">●</span>
            {SITE_NAME}
          </Link>
        </div>

        {/* Bottom — headline + benefits + social proof */}
        <div className="relative z-20 p-12">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-4">
            LA COMUNIDAD #1 DE PICKLEBALL EN ECUADOR
          </p>
          <h2
            className="font-black text-white uppercase tracking-[-0.03em]"
            style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)", lineHeight: 0.92 }}
          >
            <span className="block mb-2">JUEGA MÁS<span className="text-primary">.</span></span>
            <span className="block">JUEGA MEJOR<span className="text-primary">.</span></span>
          </h2>

          {/* Benefits list */}
          <ul className="space-y-4 mt-8 mb-10">
            {BENEFITS.map((b) => {
              const Icon = b.icon
              return (
                <li key={b.title} className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white">{b.title}</p>
                    <p className="text-xs text-white/45 mt-0.5 leading-relaxed">{b.desc}</p>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-black"
                  style={{ background: `hsl(${160 + i * 10}, 55%, ${35 + i * 5}%)` }}
                />
              ))}
            </div>
            <p className="text-xs text-white/50">
              <b className="text-white">+500</b> deportistas ya dentro
            </p>
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border lg:hidden">
          <Link href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-foreground">
            <span className="text-primary">●</span>
            {SITE_NAME}
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-[360px]">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <div className="px-6 lg:px-12 py-6 border-t border-border flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <a href="/#waitlist" className="text-primary font-bold hover:underline">
              Únete gratis
            </a>
          </p>
          <p className="text-xs text-muted-foreground/60 hidden sm:block">© {new Date().getFullYear()} MATCHPOINT</p>
        </div>
      </div>
    </div>
  )
}
