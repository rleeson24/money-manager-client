import type { Expense } from "../types/expense";
import type { ParsedCsvTransaction } from "./discoverCreditCsvParser";

/** Match key used by backend ImportDuplicateFilter (date-only + amount rounded to 2 decimals). */
export function transactionMatchKey(date: string, amount: number): string {
  const dateOnly = date.substring(0, 10);
  const amountR2 = Math.round(amount * 100) / 100;
  return `${dateOnly}|${amountR2.toFixed(2)}`;
}

/** Expenses in the database that have no matching transaction in the uploaded CSV. */
export function findExpensesMissingFromUpload(
  expenses: Expense[],
  uploaded: ParsedCsvTransaction[]
): Expense[] {
  const uploadedKeys = new Set(
    uploaded.map((t) => transactionMatchKey(t.date, t.amount))
  );

  return expenses.filter(
    (expense) => !uploadedKeys.has(transactionMatchKey(expense.date, expense.amount))
  );
}
