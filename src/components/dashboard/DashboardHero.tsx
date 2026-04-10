"use client"

interface DashboardHeroProps {
  firstName: string
}

export function DashboardHero({ firstName }: DashboardHeroProps) {
  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="animate-fade-in-up pb-8 mb-8 border-b border-border">
      <p className="label-green mb-1">Bienvenido de vuelta</p>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <h1
          className="font-black text-foreground uppercase leading-[0.88] tracking-[-0.03em]"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
        >
          Hola, {firstName}.
        </h1>
        <p className="text-sm font-medium text-zinc-400 capitalize sm:pb-1">{date}</p>
      </div>
    </div>
  )
}
