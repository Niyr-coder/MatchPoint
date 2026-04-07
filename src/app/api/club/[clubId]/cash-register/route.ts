import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import {
  getCashRegisterToday,
  getCashSummaryToday,
  addCashEntry,
} from "@/features/payments/queries"
import type { ApiResponse } from "@/types"
import type { CashEntry, CashSummary } from "@/features/payments/queries"

const addEntrySchema = z.object({
  type: z.enum(["income", "expense"] as const, { message: "Tipo inválido" }),
  amount: z.number().positive("El monto debe ser positivo"),
  concept: z.string().min(1, "El concepto es requerido").max(200),
  payment_method: z.enum(["efectivo", "tarjeta", "transferencia"] as const, {
    message: "Método de pago inválido",
  }),
  reservation_id: z.string().uuid().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<{ entries: CashEntry[]; summary: CashSummary }>>> {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "finance.cashier" })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  try {
    const [entries, summary] = await Promise.all([
      getCashRegisterToday(clubId),
      getCashSummaryToday(clubId),
    ])
    return NextResponse.json({ success: true, data: { entries, summary }, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener la caja" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<ApiResponse<CashEntry>>> {
  const { clubId } = await params

  const authResult = await authorize({ clubId, requiredPermission: "finance.cashier" })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = addEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    const entry = await addCashEntry({
      club_id: clubId,
      user_id: authResult.context.userId,
      ...parsed.data,
    })
    return NextResponse.json({ success: true, data: entry, error: null }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al registrar el movimiento" },
      { status: 500 }
    )
  }
}
