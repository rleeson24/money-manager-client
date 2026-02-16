/**
 * Expense Type Definition
 * 
 * Defines the structure of an expense object in the application
 */
export interface Expense {
  id: string | number
  description: string
  amount: number
  category?: string | null
  date: string // ISO date string format: YYYY-MM-DD
  notes?: string | null
  paymentMethod?: number | null
  datePaid?: string | null // When the expense was paid (e.g. credit card payoff)
}
