import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Check } from "lucide-react"
import { authorize } from "@/features/auth/queries"
import { OnboardingForm } from "@/components/shared/OnboardingForm"
import { SITE_NAME } from "@/lib/constants"

export const metadata: Metadata = {
  title: `Completa tu Perfil — ${SITE_NAME}`,
  description: "Completa tu perfil en MATCHPOINT para empezar a jugar.",
}

const STEPS = [
  { label: "Cuenta Google", description: "Autenticación" },
  { label: "Tu perfil", description: "Información personal" },
]

export default async function OnboardingPage() {
  const result = await authorize()
  if (result.ok && result.context.profile.onboarding_completed) {
    redirect("/dashboard")
  }
  return (
    <div className="min-h-screen bg-card flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-black text-xl tracking-tight text-foreground w-fit"
        >
          <span className="text-[#16a34a]">●</span>
          {SITE_NAME}
        </Link>
        <span className="text-xs text-muted-foreground font-medium">Paso 2 de 2</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-10 sm:py-12">
        <div className="w-full max-w-md">

          {/* Stepper */}
          <nav aria-label="Progreso de configuración" className="mb-8">
            <ol className="flex items-center gap-0">
              {STEPS.map((step, index) => {
                const isCompleted = index === 0
                const isActive = index === 1
                const isLast = index === STEPS.length - 1
                return (
                  <li key={step.label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex items-center gap-2.5">
                      {/* Circle */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                          isCompleted
                            ? "bg-[#16a34a] text-white"
                            : isActive
                            ? "bg-foreground text-white"
                            : "bg-muted border border-border text-muted-foreground"
                        }`}
                        aria-current={isActive ? "step" : undefined}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      {/* Label */}
                      <div className="hidden sm:block">
                        <p className={`text-xs font-bold leading-none ${isActive ? "text-foreground" : isCompleted ? "text-[#16a34a]" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">{step.description}</p>
                      </div>
                    </div>
                    {/* Connector */}
                    {!isLast && (
                      <div className="flex-1 h-px mx-3 bg-[#16a34a]" aria-hidden="true" />
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>

          <h1 className="font-black text-foreground text-3xl tracking-tight leading-tight mb-2">
            Completa<br />tu perfil
          </h1>
          <p className="text-[#737373] text-sm mb-8">
            Cuéntanos un poco sobre ti para personalizar tu experiencia deportiva.
          </p>

          <OnboardingForm />
        </div>
      </div>
    </div>
  )
}
