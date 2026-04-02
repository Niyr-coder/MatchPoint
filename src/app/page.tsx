import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { HeroSection } from "@/components/sections/HeroSection"
import { FeaturesSection } from "@/components/sections/FeaturesSection"
import { SportsSection } from "@/components/sections/SportsSection"
import { StatsSection } from "@/components/sections/StatsSection"
import { CtaSection } from "@/components/sections/CtaSection"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_code?: string }>
}) {
  const params = await searchParams

  // Supabase OAuth errors land here when state validation fails at the provider level.
  // Redirect to /login so the user sees a clear message instead of a blank marketing page.
  if (params.error) {
    const code = params.error_code ?? params.error
    redirect(`/login?error=${encodeURIComponent(code)}`)
  }

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <SportsSection />
        <FeaturesSection />
        <StatsSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  )
}
