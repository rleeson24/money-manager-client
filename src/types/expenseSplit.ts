/**
 * Expense split line - a sub-charge within a parent expense for reporting by category.
 */
export interface ExpenseSplit {
  id: number;
  expense_I: number;
  description: string;
  amount: number;
  category: number;
  createdDateTime?: string;
}

/**
 * Create or update split payload.
 */
export interface CreateOrUpdateExpenseSplit {
  expense_I: number;
  description: string;
  amount: number;
  category: number;
}
