import type { EventFormState, SetField } from "./types"

export function AdminEventOptions({ form, set }: { form: EventFormState; set: SetField }) {
  const isMatchPoint = form.organizer_name === "MatchPoint"
  return (
    <div className="flex flex-col gap-3 pt-1 border-t border-border">
      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 pt-1">Opciones de administrador</p>
      <button
        type="button"
        onClick={() => {
          if (isMatchPoint) {
            set("organizer_name", "")
            set("organizer_contact", "")
          } else {
            set("organizer_name", "MatchPoint")
            set("organizer_contact", "info@matchpoint.top")
          }
        }}
        className={[
          "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all text-left",
          isMatchPoint
            ? "bg-foreground text-white border-foreground"
            : "border-border text-zinc-600 hover:border-zinc-400",
        ].join(" ")}
      >
        <span>🏆</span>
        <div>
          <p className="text-xs font-black">MatchPoint organizador oficial</p>
          <p className={`text-[10px] font-normal ${isMatchPoint ? "text-white/70" : "text-zinc-400"}`}>
            {isMatchPoint ? "Activo — aparecerá como auspiciante oficial" : "Aparecerá como organizador y auspiciante oficial"}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={() => set("publishImmediately", !form.publishImmediately)}
        className={[
          "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all text-left",
          form.publishImmediately
            ? "bg-foreground text-white border-foreground"
            : "border-border text-zinc-600 hover:border-zinc-400",
        ].join(" ")}
      >
        <span>🚀</span>
        <div>
          <p className="text-xs font-black">Publicar y abrir registro al guardar</p>
          <p className={`text-[10px] font-normal ${form.publishImmediately ? "text-white/70" : "text-zinc-400"}`}>
            {form.publishImmediately ? "El evento se publicará inmediatamente" : "Por defecto se guarda como borrador"}
          </p>
        </div>
      </button>
    </div>
  )
}
