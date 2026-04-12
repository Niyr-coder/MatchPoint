"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Circle } from "lucide-react"
import { ClubSettingsForm } from "@/features/clubs/components/ClubSettingsForm"
import { CourtForm } from "@/features/clubs/components/CourtForm"
import type { Club } from "@/types"
import type { Court } from "@/features/clubs/types"

// ── Progress indicator ────────────────────────────────────────────────────────

interface StepProps {
  number: number
  label: string
  done: boolean
  active: boolean
}

function Step({ number, label, done, active }: StepProps) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="size-5 text-green-600 shrink-0" />
      ) : (
        <div
          className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[11px] font-black ${
            active
              ? "border-foreground bg-foreground text-background"
              : "border-zinc-300 text-zinc-400"
          }`}
        >
          {number}
        </div>
      )}
      <span
        className={`text-xs font-bold ${
          done ? "text-green-600" : active ? "text-foreground" : "text-zinc-400"
        }`}
      >
        {label}
      </span>
    </div>
  )
}

function ProgressBar({ settingsDone, hasCourt }: { settingsDone: boolean; hasCourt: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Step number={1} label="Datos del club" done={settingsDone} active={!settingsDone} />
      <div className="flex-1 h-px bg-border" />
      <Step number={2} label="Tu primera cancha" done={hasCourt} active={settingsDone && !hasCourt} />
    </div>
  )
}

// ── Court summary row ─────────────────────────────────────────────────────────

function CourtRow({ court }: { court: Pick<Court, "name" | "sport" | "price_per_hour"> }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted border border-border text-sm">
      <span className="font-semibold text-foreground">{court.name}</span>
      <div className="flex items-center gap-3 text-zinc-500 text-xs">
        <span className="capitalize">{court.sport}</span>
        <span>${court.price_per_hour}/h</span>
      </div>
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────

interface SetupShellProps {
  club: Club
  clubId: string
  existingCourts: Court[]
}

export function SetupShell({ club, clubId, existingCourts }: SetupShellProps) {
  const router = useRouter()
  const [settingsDone, setSettingsDone] = useState(false)
  const [sessionCourts, setSessionCourts] = useState<Court[]>([])
  const [showCourtForm, setShowCourtForm] = useState(false)

  const allCourts = [...existingCourts, ...sessionCourts]
  const hasCourt = allCourts.length > 0

  function handleCourtCreated() {
    // Re-fetch would be ideal; since we're client-side and don't want a full
    // page reload, track a sentinel so the Finalizar button unlocks. The
    // guard on the server page will confirm courts on reload anyway.
    setSessionCourts((prev) => [...prev, { id: Date.now().toString() } as unknown as Court])
    setShowCourtForm(false)
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto py-2">
      {/* Header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
          Configuración inicial
        </p>
        <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">
          Bienvenido, configura tu club
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Completa estos dos pasos para empezar a recibir reservas.
        </p>
      </div>

      <ProgressBar settingsDone={settingsDone} hasCourt={hasCourt} />

      {/* Card 1 — Datos del club */}
      <div className="rounded-2xl bg-card border border-border p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-0.5">
              Paso 1
            </p>
            <h2 className="text-base font-black text-foreground">Datos del club</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Nombre, dirección y datos de contacto visibles para los usuarios.
            </p>
          </div>
          {settingsDone && <CheckCircle2 className="size-5 text-green-600 shrink-0" />}
        </div>

        {/* ClubSettingsForm calls PATCH /api/club/[clubId]/settings on submit */}
        <ClubSettingsFormWithCallback
          club={club}
          clubId={clubId}
          onSaved={() => setSettingsDone(true)}
        />
      </div>

      {/* Card 2 — Primera cancha */}
      <div className="rounded-2xl bg-card border border-border p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-0.5">
              Paso 2
            </p>
            <h2 className="text-base font-black text-foreground">Tu primera cancha</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Agrega al menos una cancha con deporte y precio por hora.
            </p>
          </div>
          {hasCourt && <CheckCircle2 className="size-5 text-green-600 shrink-0" />}
        </div>

        {/* List existing courts */}
        {allCourts.length > 0 && (
          <div className="flex flex-col gap-2">
            {existingCourts.map((c) => (
              <CourtRow key={c.id} court={c} />
            ))}
            {sessionCourts.length > 0 && (
              <p className="text-xs text-green-600 font-semibold">
                ✓ {sessionCourts.length} cancha{sessionCourts.length > 1 ? "s" : ""} agregada{sessionCourts.length > 1 ? "s" : ""} en esta sesión
              </p>
            )}
          </div>
        )}

        {showCourtForm ? (
          <CourtForm
            clubId={clubId}
            onSuccess={handleCourtCreated}
            onCancel={() => setShowCourtForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowCourtForm(true)}
            className="w-full border border-dashed border-border rounded-xl py-3 text-sm font-semibold text-zinc-500 hover:border-foreground hover:text-foreground transition-colors"
          >
            + Agregar cancha
          </button>
        )}
      </div>

      {/* Finalizar */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => router.push(`/club/${clubId}/owner`)}
          disabled={!hasCourt}
          className="w-full rounded-xl bg-foreground text-background py-3.5 text-sm font-black tracking-tight transition-opacity disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
        >
          Finalizar y entrar al panel
        </button>
        {!hasCourt && (
          <p className="text-center text-xs text-zinc-400">
            Agrega al menos una cancha para continuar.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Thin wrapper to intercept ClubSettingsForm save ──────────────────────────
// ClubSettingsForm manages its own submit internally (PATCH fetch), so we
// intercept the success state via a polling approach using a wrapper that
// monitors the success feedback. Since ClubSettingsForm exposes no onSaved
// callback, we use a simpler UX: show a "Marcar como guardado" confirmation
// button after the user submits, so they can manually advance.

interface ClubSettingsFormWithCallbackProps {
  club: Club
  clubId: string
  onSaved: () => void
}

function ClubSettingsFormWithCallback({
  club,
  clubId,
  onSaved,
}: ClubSettingsFormWithCallbackProps) {
  const [confirmed, setConfirmed] = useState(false)

  if (confirmed) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 font-semibold py-2">
        <CheckCircle2 className="size-4" />
        Datos del club guardados
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ClubSettingsForm club={club} clubId={clubId} />
      <button
        type="button"
        onClick={() => { setConfirmed(true); onSaved() }}
        className="self-start text-xs text-zinc-400 hover:text-foreground underline underline-offset-2 transition-colors"
      >
        Ya guardé los datos del club →
      </button>
    </div>
  )
}
