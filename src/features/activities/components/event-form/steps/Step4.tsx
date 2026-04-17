import { Label, inputCls } from "../StepIndicator"
import { TagInput } from "../TagInput"
import { AdminEventOptions } from "../AdminEventOptions"
import type { EventFormState, SetField } from "../types"

export function Step4({ form, set, isAdmin }: { form: EventFormState; set: SetField; isAdmin?: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-zinc-400 -mt-1">Todo lo de esta sección es opcional.</p>

      <div className="flex flex-col gap-1.5">
        <Label>Descripción</Label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Describe el evento, qué incluye, qué llevar…"
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>URL de imagen</Label>
        <input
          type="url"
          value={form.image_url}
          onChange={(e) => set("image_url", e.target.value)}
          placeholder="https://…"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Nombre del organizador</Label>
          <input
            type="text"
            value={form.organizer_name}
            onChange={(e) => set("organizer_name", e.target.value)}
            maxLength={100}
            placeholder="Juan Pérez"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Contacto</Label>
          <input
            type="text"
            value={form.organizer_contact}
            onChange={(e) => set("organizer_contact", e.target.value)}
            maxLength={150}
            placeholder="WhatsApp o email"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Etiquetas</Label>
        <TagInput tags={form.tags} onChange={(tags) => set("tags", tags)} />
        <p className="text-[10px] text-zinc-400">Máximo 10 etiquetas</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Qué incluye (opcional)</Label>
        <TagInput
          tags={form.event_includes}
          onChange={(items) => set("event_includes", items)}
        />
        <p className="text-[10px] text-zinc-400">
          Ej: Raquetas prestadas, Agua incluida… Máx. 20 items
        </p>
      </div>

      {isAdmin && <AdminEventOptions form={form} set={set} />}
    </div>
  )
}
