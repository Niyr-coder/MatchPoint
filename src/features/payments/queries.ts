import { createServiceClient } from "@/lib/supabase/server"
import type { CashEntry, CashSummary } from "@/features/payments/types"

export type { CashEntry, CashSummary } from "@/features/payments/types"

export async function getCashRegisterToday(clubId: string): Promise<CashEntry[]> {
  try {
    const service = await createServiceClient()
    const today = new Date().toISOString().split("T")[0]

    const { data, error } = await service
      .from("cash_register_entries")
      .select(`
        id,
        type,
        amount,
        concept,
        payment_method,
        reservation_id,
        created_at,
        user_id,
        profiles ( full_name )
      `)
      .eq("club_id", clubId)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`)
      .order("created_at", { ascending: false })

    if (error || !data) return []

    type RawRow = {
      id: string
      type: string
      amount: number
      concept: string
      payment_method: string
      reservation_id: string | null
      created_at: string
      profiles: Array<{ full_name: string | null }>
    }

    return (data as unknown as RawRow[]).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        id: row.id,
        type: row.type as "income" | "expense",
        amount: row.amount,
        concept: row.concept,
        payment_method: row.payment_method,
        reservation_id: row.reservation_id,
        created_at: row.created_at,
        user_name: (profile as { full_name: string | null } | null)?.full_name ?? null,
      }
    })
  } catch {
    return []
  }
}

export async function getCashSummaryToday(clubId: string): Promise<CashSummary> {
  const entries = await getCashRegisterToday(clubId)

  const totalIncome = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0)

  const totalExpense = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0)

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    entriesCount: entries.length,
  }
}

export async function addCashEntry(input: {
  club_id: string
  user_id: string
  type: "income" | "expense"
  amount: number
  concept: string
  payment_method: string
  reservation_id?: string
}): Promise<CashEntry> {
  const service = await createServiceClient()

  const { data, error } = await service
    .from("cash_register_entries")
    .insert({
      club_id: input.club_id,
      user_id: input.user_id,
      type: input.type,
      amount: input.amount,
      concept: input.concept,
      payment_method: input.payment_method,
      reservation_id: input.reservation_id ?? null,
    })
    .select("id, type, amount, concept, payment_method, reservation_id, created_at, user_id")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Error creating cash entry")
  }

  return {
    id: data.id,
    type: data.type as "income" | "expense",
    amount: data.amount,
    concept: data.concept,
    payment_method: data.payment_method,
    reservation_id: data.reservation_id,
    created_at: data.created_at,
    user_name: null,
  }
}
