import type { Category, Expense, PaymentMethod } from "../types/expenseEditor";

// Mock data for expenses
const mockExpenses: Expense[] = [
  {
    Expense_I: 1,
    ExpenseDate: "2026-01-05T00:00:00",
    Expense: "Groceries - Whole Foods",
    Amount: 125.5,
    PaymentMethod: 1,
    Category: "Food",
    DatePaid: "2026-01-05T00:00:00",
  },
  {
    Expense_I: 2,
    ExpenseDate: "2026-01-08T00:00:00",
    Expense: "Gas Station",
    Amount: 45.0,
    PaymentMethod: 2,
    Category: "Transportation",
    DatePaid: "2026-01-08T00:00:00",
  },
  {
    Expense_I: 3,
    ExpenseDate: "2026-01-10T00:00:00",
    Expense: "Netflix Subscription",
    Amount: 15.99,
    PaymentMethod: 3,
    Category: "Entertainment",
    DatePaid: "2026-01-10T00:00:00",
  },
  {
    Expense_I: 4,
    ExpenseDate: "2026-01-12T00:00:00",
    Expense: "Electric Bill",
    Amount: 89.25,
    PaymentMethod: 1,
    Category: "Utilities",
    DatePaid: "2026-01-15T00:00:00",
  },
  {
    Expense_I: 5,
    ExpenseDate: "2026-01-15T00:00:00",
    Expense: "Restaurant - Italian",
    Amount: 67.8,
    PaymentMethod: 2,
    Category: "Food",
    DatePaid: "2026-01-15T00:00:00",
  },
  {
    Expense_I: 6,
    ExpenseDate: "2026-01-18T00:00:00",
    Expense: "Pharmacy - Prescription",
    Amount: 32.5,
    PaymentMethod: 1,
    Category: "Healthcare",
    DatePaid: "2026-01-18T00:00:00",
  },
  {
    Expense_I: 7,
    ExpenseDate: "2026-01-20T00:00:00",
    Expense: "Amazon - Office Supplies",
    Amount: 45.99,
    PaymentMethod: 3,
    Category: "Shopping",
    DatePaid: "2026-01-20T00:00:00",
  },
  {
    Expense_I: 8,
    ExpenseDate: "2026-01-22T00:00:00",
    Expense: "Gym Membership",
    Amount: 49.99,
    PaymentMethod: 1,
    Category: "Health & Fitness",
    DatePaid: "2026-01-22T00:00:00",
  },
  {
    Expense_I: 9,
    ExpenseDate: "2026-01-25T00:00:00",
    Expense: "Coffee Shop",
    Amount: 12.5,
    PaymentMethod: 2,
    Category: "Food",
    DatePaid: "2026-01-25T00:00:00",
  },
  {
    Expense_I: 10,
    ExpenseDate: "2026-01-28T00:00:00",
    Expense: "Parking Fee",
    Amount: 8.0,
    PaymentMethod: 2,
    Category: "Transportation",
    DatePaid: "2026-01-28T00:00:00",
  },
];

// Mock data for categories
const mockCategories: Category[] = [
  { Category_I: 1, Name: "Food" },
  { Category_I: 2, Name: "Transportation" },
  { Category_I: 3, Name: "Entertainment" },
  { Category_I: 4, Name: "Utilities" },
  { Category_I: 5, Name: "Healthcare" },
  { Category_I: 6, Name: "Shopping" },
  { Category_I: 7, Name: "Health & Fitness" },
  { Category_I: 8, Name: "Housing" },
  { Category_I: 9, Name: "Education" },
  { Category_I: 10, Name: "Other" },
];

// Mock data for payment methods
const mockPaymentMethods: PaymentMethod[] = [
  { ID: 1, PaymentMethod: "Credit Card" },
  { ID: 2, PaymentMethod: "Debit Card" },
  { ID: 3, PaymentMethod: "Cash" },
  { ID: 4, PaymentMethod: "Bank Transfer" },
  { ID: 5, PaymentMethod: "PayPal" },
  { ID: 6, PaymentMethod: "Venmo" },
];

/**
 * Fetches expenses for the given month, optionally filtered by search term.
 * TODO: Replace with actual API call when backend is ready (e.g. GET /api/expenses?month=...&search=...).
 */
export async function getExpenses(
  month: string,
  search?: string
): Promise<Expense[]> {
  let filtered = mockExpenses.filter((exp) => {
    const expMonth = exp.ExpenseDate.substring(0, 7);
    return expMonth === month;
  });
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter(
      (exp) =>
        (exp.Expense && exp.Expense.toLowerCase().includes(term)) ||
        (exp.Category && exp.Category.toLowerCase().includes(term)) ||
        (exp.Amount !== undefined && exp.Amount.toString().includes(term))
    );
  }
  return filtered;
}

/**
 * Fetches all categories.
 * TODO: Replace with actual API call when backend is ready (e.g. GET /api/categories).
 */
export async function getCategories(): Promise<Category[]> {
  return mockCategories;
}

/**
 * Fetches all payment methods.
 * TODO: Replace with actual API call when backend is ready (e.g. GET /api/payment-methods).
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  return mockPaymentMethods;
}
