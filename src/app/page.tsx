import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { HeroSection } from "@/components/sections/HeroSection"
import { FeaturesSection } from "@/components/sections/FeaturesSection"
import { SportsSection } from "@/components/sections/SportsSection"
import { StatsSection } from "@/components/sections/StatsSection"
import { CtaSection } from "@/components/sections/CtaSection"

export default function HomePage() {
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
