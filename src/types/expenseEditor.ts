/**
 * Types for the expense editor page (ChatGPTEditExpenses).
 */

export interface Expense {
  Expense_I: number;
  ExpenseDate: string;
  Expense: string;
  Amount: number;
  PaymentMethod?: number | null;
  Category?: string | null;
  DatePaid?: string;
}

export interface Category {
  Category_I: number;
  Name: string;
}

export interface PaymentMethod {
  ID: number;
  PaymentMethod: string;
}
