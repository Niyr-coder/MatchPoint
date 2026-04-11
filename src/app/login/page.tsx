import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { LoginForm } from "@/components/shared/LoginForm"
import { SITE_NAME } from "@/lib/constants"

export const metadata: Metadata = {
  title: `Iniciar Sesión — ${SITE_NAME}`,
  description: "Accede a tu cuenta de MATCHPOINT y encuentra tu próximo partido.",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left — Hero panel (same visual identity as landing hero) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black flex-col justify-between">
        {/* Background image — same as landing hero */}
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

        {/* Gradient overlay — bottom fade like hero */}
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent z-10 pointer-events-none" />
        {/* Green glow — same radial as landing */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(16,185,129,0.18),transparent_60%)] z-10 pointer-events-none" />

        {/* Top — logo */}
        <div className="relative z-20 p-12 xl:p-16">
          <Link href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-white">
            <span className="text-primary">●</span>
            {SITE_NAME}
          </Link>
        </div>

        {/* Bottom — headline + social proof */}
        <div className="relative z-20 p-12 xl:p-16">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4">
            LA COMUNIDAD #1 DE PICKLEBALL EN ECUADOR
          </p>
          <h2
            className="font-black text-white uppercase tracking-[-0.03em] mb-8"
            style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)", lineHeight: 0.92 }}
          >
            <span className="block mb-2">JUEGA MÁS<span className="text-primary">.</span></span>
            <span className="block">JUEGA MEJOR<span className="text-primary">.</span></span>
          </h2>

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["🏓", "🎾", "🏸", "⚽"].map((emoji, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-sm"
                >
                  {emoji}
                </div>
              ))}
            </div>
            <p className="text-xs text-white/50">
              <span className="text-white font-semibold">+500</span> deportistas ya registrados
            </p>
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-card">
        {/* Mobile logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border lg:hidden">
          <Link href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-foreground">
            <span className="text-primary">●</span>
            {SITE_NAME}
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>

        <div className="px-6 py-5 text-center lg:hidden border-t border-border">
          <p className="text-xs text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <a href="/#waitlist" className="text-primary font-semibold hover:underline">
              Únete gratis
            </a>
          </p>
        </div>

        <div className="hidden lg:flex px-12 py-6 border-t border-border justify-between items-center">
          <p className="text-xs text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <a href="/#waitlist" className="text-primary font-semibold hover:underline">
              Únete gratis
            </a>
          </p>
          <p className="text-xs text-muted-foreground/50">© {new Date().getFullYear()} {SITE_NAME}</p>
        </div>
      </div>
    </div>
  )
}
