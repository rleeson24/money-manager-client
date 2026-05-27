import type { Expense } from "../types/expense";

const SESSION_KEY = "money-manager:add-expense-session";

export function getSessionExpenses(): Expense[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Expense[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setSessionExpenses(expenses: Expense[]): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(expenses));
}
