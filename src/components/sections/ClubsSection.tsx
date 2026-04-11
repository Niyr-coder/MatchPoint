import { CalendarCheck, LayoutDashboard, BadgeDollarSign, ArrowRight, type LucideIcon } from "lucide-react"
import { ScrollReveal } from "@/components/shared/ScrollReveal"

interface BenefitProps {
  icon: LucideIcon
  title: string
  desc: string
}

function BenefitCard({ icon: Icon, title, desc }: BenefitProps) {
  return (
    <div className="p-8 rounded-2xl border border-white/10 bg-white/5 hover:border-primary/40 transition-colors duration-300">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">{title}</h3>
      <p className="text-white/50 font-medium leading-relaxed text-sm">{desc}</p>
    </div>
  )
}

const BENEFITS: BenefitProps[] = [
  {
    icon: CalendarCheck,
    title: "Reservas 24/7",
    desc: "Tus canchas se llenan solas. Los jugadores reservan y pagan en línea, sin que tengas que contestar un solo WhatsApp.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard en Tiempo Real",
    desc: "Ocupación, ingresos, horarios pico. Todo en un panel claro. Toma decisiones con datos, no con corazonadas.",
  },
  {
    icon: BadgeDollarSign,
    title: "Cero Comisión por Ahora",
    desc: "Acceso anticipado sin costo para los primeros clubes. Entra ahora y congela tus condiciones antes del lanzamiento oficial.",
  },
]

export function ClubsSection() {
  return (
    <section id="clubes" className="section-dark py-24 border-t border-white/5">
      <div className="container mx-auto px-6 sm:px-8">
        <ScrollReveal>
          <p className="label-green">Para Clubes</p>
          <h2
            className="font-black text-white uppercase leading-[0.88] tracking-[-0.03em] mb-4 max-w-2xl"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            TU CLUB.<br />MÁS RESERVAS.<br />MENOS TRABAJO.
          </h2>
          <p className="text-white/50 text-lg font-medium mb-16 max-w-lg">
            Pon tus canchas en MATCHPOINT y deja que los jugadores lleguen solos.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {BENEFITS.map((benefit, i) => (
            <ScrollReveal key={benefit.title} delay={i * 0.1}>
              <BenefitCard {...benefit} />
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.3}>
          <a
            href="/login"
            className="btn-pill bg-primary text-white px-10 py-3.5 inline-flex items-center gap-2"
          >
            Registra tu Club <ArrowRight className="w-4 h-4" />
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}
