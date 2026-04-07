export interface CashEntry {
  id: string
  type: "income" | "expense"
  amount: number
  concept: string
  payment_method: string
  reservation_id: string | null
  created_at: string
  user_name: string | null
}

export interface CashSummary {
  totalIncome: number
  totalExpense: number
  balance: number
  entriesCount: number
}
