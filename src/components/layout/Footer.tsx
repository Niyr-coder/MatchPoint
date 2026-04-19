import { SITE_NAME, FOOTER_COLUMNS } from "@/lib/constants"

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.75l7.73-8.835L2.27 2.25h6.992l4.265 5.638L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
      <path d="m10 15 5-3-5-3z"/>
    </svg>
  )
}

const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", icon: InstagramIcon },
  { label: "X (Twitter)", href: "#", icon: XIcon },
  { label: "YouTube", href: "#", icon: YouTubeIcon },
]

export function Footer() {
  return (
    <footer className="bg-[#0a0a0a] text-white" style={{ padding: "80px 32px 32px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-14">
          {/* Brand column — takes 2 cols */}
          <div className="col-span-2">
            <a href="/" className="flex items-center gap-1.5 font-black text-2xl tracking-[-0.03em] text-white mb-3.5">
              <span className="text-primary text-2xl">●</span>
              {SITE_NAME}
            </a>
            <p className="text-white/50 text-[13px] leading-relaxed max-w-[280px]">
              La comunidad #1 de pickleball en Ecuador. Hecho con café en Quito.
            </p>
            <div className="flex gap-2.5 mt-5">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#34d399] mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[13px] text-white/60 hover:text-white/80 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.08] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} MatchPoint. Todos los derechos reservados.
          </p>
          <p className="text-xs text-white/40">
            Quito · Guayaquil · Cuenca
          </p>
        </div>
      </div>
    </footer>
  )
}
