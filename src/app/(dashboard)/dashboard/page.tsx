import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner"
import { ReservasPanel } from "@/components/dashboard/ReservasPanel"
import { CanchasMapPanel } from "@/components/dashboard/CanchasMapPanel"
import { TorneosPanel } from "@/components/dashboard/TorneosPanel"

export default async function UserDashboardPage() {
  const ctx = await authorizeOrRedirect()
  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner profile={ctx.profile} date={date} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReservasPanel />
        <CanchasMapPanel />
      </div>

      <TorneosPanel />
    </div>
  )
}
