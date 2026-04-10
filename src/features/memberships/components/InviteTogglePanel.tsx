"use client"

import { useState } from "react"
import { Link2 } from "lucide-react"
import { InviteLinkGenerator } from "@/features/memberships/components/InviteLinkGenerator"
import type { InviteEntityType } from "@/features/memberships/actions"

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
            : "border-border text-zinc-500 hover:border-[#16a34a] hover:text-[#16a34a]"
        }`}
      >
        <Link2 className="size-3.5" />
        {open ? "Cerrar" : "Generar link de invitación"}
      </button>

      {open && (
        <div className="rounded-xl border border-border bg-muted p-4">
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
