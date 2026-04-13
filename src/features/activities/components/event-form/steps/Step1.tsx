import { SPORTS, EVENT_TYPES, EVENT_TYPE_CONFIG } from "@/features/activities/constants"
import { SINGLE_SPORT_MODE } from "@/lib/sports/config"
import { Label, inputCls } from "../StepIndicator"
import { TYPE_EMOJI } from "../types"
import type { EventFormState, SetField } from "../types"

export function Step1({ form, set, errors = [] }: { form: EventFormState; set: SetField; errors?: string[] }) {
  const titleInvalid = errors.some((e) => e.includes("nombre"))
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label required>Nombre del evento</Label>
        <input
          autoFocus
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          minLength={3}
          maxLength={120}
          placeholder="Clínica de Pádel para principiantes…"
          data-invalid={titleInvalid}
          className={`${inputCls} data-[invalid=true]:border-red-400`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label required>Tipo de evento</Label>
        <div className="grid grid-cols-4 gap-2">
          {EVENT_TYPES.map((t) => {
            const cfg = EVENT_TYPE_CONFIG[t.value]
            const selected = form.event_type === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => set("event_type", t.value)}
                className={[
                  "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all",
                  selected
                    ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm ring-2 ring-offset-1 ring-current/10`
                    : "border-border bg-card text-zinc-500 hover:border-zinc-300 hover:bg-muted/30",
                ].join(" ")}
              >
                <span className="text-lg leading-none">{TYPE_EMOJI[t.value]}</span>
                <span className="text-[10px] font-bold leading-tight">{t.label}</span>
              </button>
            )
          })}
        </div>
        {(() => {
          const cfg = EVENT_TYPE_CONFIG[form.event_type]
          return (
            <p className={`text-xs px-3 py-2 rounded-lg border ${cfg.bg} ${cfg.border} ${cfg.color} transition-all`}>
              <span className="font-bold">{cfg.label}:</span>{" "}{cfg.description}
            </p>
          )
        })()}
      </div>

      {!SINGLE_SPORT_MODE && (
        <div className="flex flex-col gap-2">
          <Label>Deporte</Label>
          <div className="flex flex-wrap gap-1.5">
            {[{ value: "", label: "Todos" }, ...SPORTS].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => set("sport", s.value)}
                className={[
                  "px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
                  form.sport === s.value
                    ? "bg-foreground text-white border-foreground"
                    : "border-border text-zinc-500 hover:border-zinc-300",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
