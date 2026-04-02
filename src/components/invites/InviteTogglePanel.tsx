"use client"

import { useState } from "react"
import { Link2 } from "lucide-react"
import { InviteLinkGenerator } from "@/components/invites/InviteLinkGenerator"
import type { InviteEntityType } from "@/lib/invites/join-handlers"

interface InviteTogglePanelProps {
  entityType: InviteEntityType
  entityId: string
  label?: string
}

export function InviteTogglePanel({ entityType, entityId, label }: InviteTogglePanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${
          open
            ? "bg-[#16a34a] text-white border-[#16a34a]"
            : "border-[#e5e5e5] text-zinc-500 hover:border-[#16a34a] hover:text-[#16a34a]"
        }`}
      >
        <Link2 className="size-3.5" />
        {open ? "Cerrar" : "Generar link de invitación"}
      </button>

      {open && (
        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4">
          <InviteLinkGenerator
            entityType={entityType}
            entityId={entityId}
            label={label ?? "Generar link"}
          />
        </div>
      )}
    </div>
  )
}
