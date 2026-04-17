"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { EventFormState } from "../components/EventForm"
import type { EventStatus } from "../types"

// ── types ──────────────────────────────────────────────────────────────────────

interface UseEventMutationsOptions {
  /** "/api/events" for club views, "/api/admin/events" for admin views */
  apiBasePath: string
}

interface BuildPayloadOptions {
  form: EventFormState
  /** When provided, overrides form.club_id (used by ClubEventsView where clubId
   *  comes from props, not the form). */
  clubId?: string
}

// ── payload builder ────────────────────────────────────────────────────────────

function buildPayload({ form, clubId }: BuildPayloadOptions): Record<string, unknown> {
  // ClubEventsView guards start_date because the form field might be empty;
  // AdminEventsView always interpolates. We guard to be safe in both cases.
  const startIso = form.start_date
    ? `${form.start_date}T${form.start_time || "00:00"}:00Z`
    : undefined

  const endIso = form.end_date
    ? `${form.end_date}T${form.end_time || "00:00"}:00Z`
    : undefined

  return {
    title:                 form.title.trim(),
    description:           form.description || undefined,
    event_type:            form.event_type,
    sport:                 form.sport || undefined,
    // clubId (from props) takes precedence; fall back to form.club_id for admin
    club_id:               clubId ?? (form.club_id || undefined),
    city:                  form.city || undefined,
    location:              form.location || undefined,
    start_date:            startIso,
    end_date:              endIso,
    image_url:             form.image_url || undefined,
    max_capacity:          form.max_capacity ? parseInt(form.max_capacity, 10) : undefined,
    is_free:               form.is_free,
    price:                 !form.is_free && form.price ? parseFloat(form.price) : undefined,
    visibility:            form.visibility,
    registration_deadline: form.registration_deadline
      ? `${form.registration_deadline}T00:00:00Z`
      : undefined,
    min_participants:      form.min_participants ? parseInt(form.min_participants, 10) : undefined,
    organizer_name:        form.organizer_name || undefined,
    organizer_contact:     form.organizer_contact || undefined,
    tags:                  form.tags.length > 0 ? form.tags : undefined,
    event_includes:        form.event_includes,
    ...(form.publishImmediately ? { status: "published" } : {}),
  }
}

// ── hook ───────────────────────────────────────────────────────────────────────

export function useEventMutations({ apiBasePath }: UseEventMutationsOptions) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [modalLoading, setModalLoading]       = useState(false)
  const [modalError, setModalError]           = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [actionError, setActionError]         = useState<string | null>(null)

  function refresh() {
    startTransition(() => router.refresh())
  }

  /**
   * Create or update an event.
   *
   * @param form       - validated form state
   * @param mode       - "create" | "edit"
   * @param eventId    - required when mode === "edit"
   * @param clubId     - when provided, overrides form.club_id (ClubEventsView)
   * @returns true on success, false on error (error message stored in modalError)
   */
  async function submitEvent(
    form: EventFormState,
    mode: "create" | "edit",
    eventId?: string,
    clubId?: string,
  ): Promise<boolean> {
    setModalLoading(true)
    setModalError(null)

    try {
      const payload = buildPayload({ form, clubId })
      const url     = mode === "edit" && eventId ? `${apiBasePath}/${eventId}` : apiBasePath
      const method  = mode === "edit" ? "PUT" : "POST"

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }

      if (!json.success) {
        setModalError(json.error ?? "Error desconocido")
        return false
      }

      refresh()
      return true
    } catch {
      setModalError("Error de conexión. Intenta de nuevo.")
      return false
    } finally {
      setModalLoading(false)
    }
  }

  /**
   * Update only the status field of an event (publish, unpublish, cancel,
   * complete, etc.).
   */
  async function updateStatus(eventId: string, newStatus: EventStatus): Promise<void> {
    setActionLoadingId(eventId)
    setActionError(null)

    try {
      const res  = await fetch(`${apiBasePath}/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }

      if (!json.success) {
        setActionError(json.error ?? "Error al actualizar")
        return
      }

      refresh()
    } catch {
      setActionError("Error de conexión.")
    } finally {
      setActionLoadingId(null)
    }
  }

  /** Hard-delete an event (admin only). */
  async function deleteEvent(eventId: string): Promise<void> {
    setActionLoadingId(eventId)
    setActionError(null)

    try {
      const res  = await fetch(`${apiBasePath}/${eventId}`, { method: "DELETE" })
      const json = (await res.json()) as { success: boolean; error?: string | null }

      if (!json.success) {
        setActionError(json.error ?? "Error al eliminar")
        return
      }

      refresh()
    } catch {
      setActionError("Error de conexión.")
    } finally {
      setActionLoadingId(null)
    }
  }

  return {
    modalLoading,
    modalError,
    actionLoadingId,
    actionError,
    submitEvent,
    updateStatus,
    deleteEvent,
    setModalError,
    setActionError,
  }
}
