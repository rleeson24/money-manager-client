/**
 * Expense Type Definition
 * 
 * Defines the structure of an expense object in the application
 */
export interface Expense {
  id: string | number
  description: string
  amount: number
  category?: number | null
  date: string // ISO date string format: YYYY-MM-DD
  notes?: string | null
  paymentMethod?: number | null
  datePaid?: string | null // When the expense was paid (e.g. credit card payoff)
  /** Server-set; used for optimistic concurrency on update */
  createdDateTime?: string
  modifiedDateTime?: string
}
