import { SITE_NAME, FOOTER_COLUMNS } from "@/lib/constants"

export function Footer() {
  return (
    <footer className="section-dark border-t border-white/5">
      <div className="container mx-auto px-6 sm:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-12 border-b border-white/[0.06]">
          {/* Brand */}
          <div className="col-span-2">
            <a href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-white mb-5">
              <span className="text-[#16a34a]">●</span>
              {SITE_NAME}
            </a>
            <p className="text-white/30 text-sm leading-relaxed max-w-[200px] mb-7">
              La plataforma deportiva que conecta jugadores, canchas y torneos en tu ciudad.
            </p>
            <div className="flex gap-2">
              {["IG", "TW", "TK"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-xs font-semibold text-white/30 hover:border-[#16a34a]/50 hover:text-[#16a34a] transition-colors duration-200"
                >
                  {social}
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
            Hecho con <span className="text-[#16a34a]">♥</span> para la comunidad deportiva
          </p>
        </div>
      </div>
    </footer>
  )
}
