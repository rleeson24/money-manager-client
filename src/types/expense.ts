/**
 * Expense Type Definition
 * 
 * Defines the structure of an expense object in the application
 */
export interface Expense {
  id: string | number
  description: string
  amount: number
  category: string
  date: string // ISO date string format: YYYY-MM-DD
  notes?: string
}

/**
 * Expense Form Data
 * 
 * Used for creating and editing expenses
 */
export interface ExpenseFormData {
  description: string
  amount: number
  category: string
  date: string
  notes?: string
}
