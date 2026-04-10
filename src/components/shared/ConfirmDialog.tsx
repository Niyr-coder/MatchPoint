"use client"

import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  variant?: "danger" | "default"
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmClasses =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-foreground hover:bg-foreground-hover text-background"

  async function handleConfirm() {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-w-md mx-auto">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-base font-black uppercase tracking-tight text-foreground">
            {title}
          </SheetTitle>
          <SheetDescription className="text-sm text-zinc-500">
            {description}
          </SheetDescription>
        </SheetHeader>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 border border-border rounded-full py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 rounded-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${confirmClasses}`}
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
