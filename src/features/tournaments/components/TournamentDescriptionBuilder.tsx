"use client"

interface Template {
  id: string
  label: string
  emoji: string
  description: string
  text: string
}

const TEMPLATES: Template[] = [
  {
    id: "competitive",
    label: "Competitivo",
    emoji: "🏆",
    description: "Formato riguroso, reglas oficiales",
    text: "Torneo de alto rendimiento con aplicación estricta de las reglas internacionales del deporte. Clasificación por puntos con eliminación directa. Los participantes serán evaluados en cada enfrentamiento. Se premiará a los tres primeros lugares. Recomendado para jugadores con experiencia en competencias.",
  },
  {
    id: "social",
    label: "Social",
    emoji: "🎉",
    description: "Amistoso, todos los niveles",
    text: "Torneo amistoso pensado para disfrutar el deporte en compañía. Ideal para jugadores de todos los niveles: el objetivo es compartir, conocer nuevos rivales y pasarla bien. ¡Únete y demuestra tu juego!",
  },
  {
    id: "professional",
    label: "Profesional",
    emoji: "🎯",
    description: "Con árbitros, premios y patrocinadores",
    text: "Torneo profesional con árbitros oficiales, cobertura fotográfica y transmisión en vivo. Contamos con el respaldo de patrocinadores locales y premios para los finalistas. Plazas limitadas — inscríbete antes de que se agoten los cupos.",
  },
]

interface Props {
  onSelect: (text: string) => void
}

export function TournamentDescriptionBuilder({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
        Plantillas rápidas
      </p>
      <div className="flex flex-col gap-1.5">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.text)}
            className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-foreground/40 hover:bg-muted/50 transition-all text-left group"
          >
            <span className="text-base leading-none mt-0.5">{t.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground group-hover:text-foreground">
                {t.label}
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{t.description}</p>
            </div>
            <span className="text-[10px] text-zinc-300 group-hover:text-zinc-500 transition-colors mt-0.5 shrink-0">
              Usar →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
