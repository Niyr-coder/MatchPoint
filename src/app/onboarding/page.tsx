import { Metadata } from "next"
import Link from "next/link"
import { OnboardingForm } from "@/components/shared/OnboardingForm"
import { SITE_NAME } from "@/lib/constants"

export const metadata: Metadata = {
  title: `Completa tu Perfil — ${SITE_NAME}`,
  description: "Completa tu perfil en MATCHPOINT para empezar a jugar.",
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-card flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-black text-xl tracking-tight text-foreground w-fit"
        >
          <span className="text-[#16a34a]">●</span>
          {SITE_NAME}
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <p className="label-green mb-4">Paso 2 de 2</p>

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
