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

function TikTokIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.28 8.28 0 0 0 4.83 1.54V6.79a4.85 4.85 0 0 1-1.06-.1z"/>
    </svg>
  )
}

const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", icon: InstagramIcon },
  { label: "X (Twitter)", href: "#", icon: XIcon },
  { label: "TikTok", href: "#", icon: TikTokIcon },
]

export function Footer() {
  return (
    <footer className="section-dark border-t border-white/5">
      <div className="container mx-auto px-6 sm:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-12 border-b border-white/[0.06]">
          {/* Brand */}
          <div className="col-span-2">
            <a href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-white mb-5">
              <span className="text-primary">●</span>
              {SITE_NAME}
            </a>
            <p className="text-white/30 text-sm leading-relaxed max-w-[200px] mb-7">
              La plataforma deportiva que conecta jugadores, canchas y torneos en tu ciudad.
            </p>
            <div className="flex gap-2">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:border-primary/50 hover:text-primary transition-colors duration-200"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-black uppercase tracking-widest text-white/25 mb-5">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.
          </p>
          <p className="text-xs text-white/20 flex items-center gap-1.5">
            Hecho con <span className="text-primary">♥</span> para la comunidad deportiva
          </p>
        </div>
      </div>
    </footer>
  )
}
