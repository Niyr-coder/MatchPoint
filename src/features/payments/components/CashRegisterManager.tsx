"use client"

import { useState } from "react"
import { Wallet, ChevronDown } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { StatusBadge } from "@/components/shared/StatusBadge"
import type { CashEntry } from "@/features/payments/types"

type PaymentMethod = "efectivo" | "tarjeta" | "transferencia"

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatAmount(amount: number): string {
  return `$${amount.toFixed(2)}`
}

interface CashRegisterManagerProps {
  clubId: string
  initialEntries: CashEntry[]
}

export function CashRegisterManager({ clubId, initialEntries }: CashRegisterManagerProps) {
  const [entries, setEntries] = useState<CashEntry[]>(initialEntries)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [type, setType] = useState<"income" | "expense">("income")
  const [amount, setAmount] = useState("")
  const [concept, setConcept] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo")

  function resetForm() {
    setType("income")
    setAmount("")
    setConcept("")
    setPaymentMethod("efectivo")
    setFormError(null)
  }

  async function handleSubmit() {
    const parsedAmount = parseFloat(amount)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Ingresa un monto válido mayor a cero")
      return
    }
    if (!concept.trim()) {
      setFormError("El concepto es requerido")
      return
    }

    setLoading(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/club/${clubId}/cash-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: parsedAmount,
          concept: concept.trim(),
          payment_method: paymentMethod,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setFormError(json.error ?? "Error al registrar")
        return
      }
      setEntries((prev) => [json.data as CashEntry, ...prev])
      resetForm()
      setSheetOpen(false)
    } catch {
      setFormError("Error de red. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Add entry trigger */}
      <div className="flex justify-end">
        <button
          onClick={() => setSheetOpen(true)}
          className="bg-[#0a0a0a] text-white rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] flex items-center gap-2 hover:bg-zinc-800 transition-colors"
        >
          <Wallet className="size-3.5" />
          Registrar Movimiento
        </button>
      </div>

      {/* Entries list */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-[#e5e5e5] rounded-2xl">
          <Wallet className="size-10 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-400">Sin movimientos hoy</p>
          <p className="text-xs text-zinc-300">Registra el primer movimiento del día</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-4 border-b border-[#e5e5e5] px-5 py-3 bg-zinc-50/60">
            {["Hora", "Tipo", "Concepto / Método", "Monto"].map((h) => (
              <div
                key={h}
                className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#f0f0f0]">
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className="animate-fade-in-up grid grid-cols-4 px-5 py-3.5 items-center"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <span className="text-sm text-zinc-500">{formatTime(entry.created_at)}</span>
                <div>
                  <StatusBadge
                    label={entry.type === "income" ? "Ingreso" : "Gasto"}
                    variant={entry.type === "income" ? "success" : "error"}
                  />
                </div>
                <div>
                  <p className="text-sm text-[#0a0a0a] font-medium">{entry.concept}</p>
                  <p className="text-[11px] text-zinc-400">
                    {PAYMENT_LABELS[entry.payment_method as PaymentMethod] ?? entry.payment_method}
                  </p>
                </div>
                <span
                  className={`text-sm font-black ${
                    entry.type === "income" ? "text-[#16a34a]" : "text-red-500"
                  }`}
                >
                  {entry.type === "expense" ? "-" : "+"}
                  {formatAmount(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add movement sheet */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) resetForm() }}>
        <SheetContent side="right" className="w-full max-w-sm">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-base font-black uppercase tracking-tight text-[#0a0a0a]">
              Registrar Movimiento
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4">
            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setType("income")}
                className={`flex-1 rounded-full py-2 text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${
                  type === "income"
                    ? "bg-[#16a34a] text-white"
                    : "border border-[#e5e5e5] text-zinc-500 hover:border-zinc-300"
                }`}
              >
                Ingreso
              </button>
              <button
                onClick={() => setType("expense")}
                className={`flex-1 rounded-full py-2 text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${
                  type === "expense"
                    ? "bg-red-500 text-white"
                    : "border border-[#e5e5e5] text-zinc-500 hover:border-zinc-300"
                }`}
              >
                Gasto
              </button>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                Monto (USD)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
              />
            </div>

            {/* Concept */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                Concepto
              </label>
              <input
                type="text"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej: Reserva cancha 2"
                className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
              />
            </div>

            {/* Payment method */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                Método de Pago
              </label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full appearance-none border border-[#e5e5e5] rounded-xl px-4 pr-9 py-3 text-sm font-bold text-[#0a0a0a] outline-none focus:border-[#0a0a0a] bg-white cursor-pointer"
                >
                  {Object.entries(PAYMENT_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="size-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {formError && (
              <p className="text-xs text-red-500 font-bold">{formError}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#0a0a0a] hover:bg-[#222222] text-white rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? "Registrando..." : "Registrar"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
