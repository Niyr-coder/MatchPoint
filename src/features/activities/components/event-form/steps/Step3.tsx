import { EVENT_VISIBILITIES } from "@/features/activities/constants"
import { Label, inputCls } from "../StepIndicator"
import type { EventFormState, SetField, ClubOption } from "../types"
import type { EventVisibility } from "@/features/activities/types"

export function Step3({ form, set, clubs }: { form: EventFormState; set: SetField; clubs: ClubOption[] }) {
  return (
    <div className="flex flex-col gap-5">
      {clubs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Club organizador</Label>
          <select
            value={form.club_id}
            onChange={(e) => set("club_id", e.target.value)}
            className={`${inputCls} appearance-none cursor-pointer`}
          >
            <option value="">Sin club asociado</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Price toggle */}
      <div className="flex flex-col gap-2">
        <Label>Precio</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set("is_free", true)}
            className={[
              "py-2.5 rounded-xl border text-sm font-bold transition-all",
              form.is_free
                ? "bg-foreground text-white border-foreground"
                : "border-border text-zinc-500 hover:border-zinc-300",
            ].join(" ")}
          >
            Gratuito
          </button>
          <button
            type="button"
            onClick={() => set("is_free", false)}
            className={[
              "py-2.5 rounded-xl border text-sm font-bold transition-all",
              !form.is_free
                ? "bg-foreground text-white border-foreground"
                : "border-border text-zinc-500 hover:border-zinc-300",
            ].join(" ")}
          >
            Con costo
          </button>
        </div>
        {!form.is_free && (
          <input
            type="number"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            min={0}
            step={0.01}
            placeholder="Precio en USD"
            className={inputCls}
          />
        )}
      </div>

      {/* Capacity */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Capacidad máxima</Label>
          <input
            type="number"
            value={form.max_capacity}
            onChange={(e) => set("max_capacity", e.target.value)}
            min={1}
            max={10000}
            placeholder="Sin límite"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Mínimo participantes</Label>
          <input
            type="number"
            value={form.min_participants}
            onChange={(e) => set("min_participants", e.target.value)}
            min={1}
            placeholder="—"
            className={inputCls}
          />
        </div>
      </div>

      {/* Visibility + deadline */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Visibilidad</Label>
          <select
            value={form.visibility}
            onChange={(e) => set("visibility", e.target.value as EventVisibility)}
            className={`${inputCls} appearance-none cursor-pointer`}
          >
            {EVENT_VISIBILITIES.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Límite de registro</Label>
          <input
            type="date"
            value={form.registration_deadline}
            onChange={(e) => set("registration_deadline", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  )
}
