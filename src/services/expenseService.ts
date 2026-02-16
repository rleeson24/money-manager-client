import type { Expense } from "../types/expense";

/** API response shape (Expense_I, ExpenseDate, etc.) */
interface ApiExpense {
  Expense_I: number;
  ExpenseDate: string;
  Expense: string;
  Amount: number;
  PaymentMethod?: number;
  Category?: string;
  DatePaid?: string;
}

function toExpense(api: ApiExpense): Expense {
  return {
    id: api.Expense_I,
    date: api.ExpenseDate,
    description: api.Expense,
    amount: api.Amount,
    paymentMethod: api.PaymentMethod ?? null,
    category: api.Category ?? null,
    datePaid: api.DatePaid ?? null,
  };
}

function partialToApi(updates: Partial<Expense>): Partial<ApiExpense> {
  const api: Partial<ApiExpense> = {};
  if (updates.id !== undefined) api.Expense_I = typeof updates.id === "string" ? parseInt(updates.id, 10) : updates.id;
  if (updates.date !== undefined) api.ExpenseDate = updates.date;
  if (updates.description !== undefined) api.Expense = updates.description;
  if (updates.amount !== undefined) api.Amount = updates.amount;
  if (updates.paymentMethod !== undefined) api.PaymentMethod = updates.paymentMethod ?? undefined;
  if (updates.category !== undefined) api.Category = updates.category ?? undefined;
  if (updates.datePaid !== undefined) api.DatePaid = updates.datePaid ?? undefined;
  return api;
}

// Mock data in API shape
const mockExpenses: ApiExpense[] = [
  { Expense_I: 1, ExpenseDate: "2026-01-19T00:00:00", Expense: "COPA AIRLINES PANAMA PAN", Amount: 126.34, PaymentMethod: 1, Category: "Other Expenses (Pare)", DatePaid: undefined },
  { Expense_I: 2, ExpenseDate: "2026-01-22T00:00:00", Expense: "Freddy's - custard", Amount: 5.51, PaymentMethod: 1, Category: "Dining/Eating Out", DatePaid: undefined },
  { Expense_I: 3, ExpenseDate: "2026-01-22T00:00:00", Expense: "WALMART.COM - David birthday present - couch", Amount: 83.30, PaymentMethod: 1, Category: "Special Occasions (P)", DatePaid: undefined },
  { Expense_I: 4, ExpenseDate: "2026-01-23T00:00:00", Expense: "Gas Station", Amount: 45.0, PaymentMethod: 1, Category: "Gas - Auto", DatePaid: undefined },
  { Expense_I: 5, ExpenseDate: "2026-01-24T00:00:00", Expense: "Ross - return lita shoes", Amount: 21.79, PaymentMethod: 1, Category: "Other Expenses (Pare)", DatePaid: undefined },
  { Expense_I: 6, ExpenseDate: "2026-01-25T00:00:00", Expense: "AMAZON - Luca Christmas gift", Amount: 15.99, PaymentMethod: 1, Category: "Gifts (Parent)", DatePaid: undefined },
  { Expense_I: 7, ExpenseDate: "2026-01-26T00:00:00", Expense: "Pharmacy - Prescription", Amount: 32.5, PaymentMethod: 1, Category: "Health", DatePaid: undefined },
  { Expense_I: 8, ExpenseDate: "2026-01-27T00:00:00", Expense: "Groceries - Whole Foods", Amount: 125.5, PaymentMethod: 1, Category: "Groceries (Parent)", DatePaid: undefined },
  { Expense_I: 9, ExpenseDate: "2026-01-28T00:00:00", Expense: "Outdoor Equipment", Amount: 89.25, PaymentMethod: 1, Category: "Outdoors (Parent)", DatePaid: undefined },
];

export type { Expense };

/**
 * Get expenses with optional filters
 */
export async function getExpenses(params?: {
  month?: string;
  search?: string;
  paymentMethod?: number;
  datePaidNull?: boolean;
}): Promise<Expense[]> {
  let filtered = [...mockExpenses];

  if (params?.month) {
    filtered = filtered.filter((exp) => {
      const expMonth = exp.ExpenseDate.substring(0, 7);
      return expMonth === params.month;
    });
  }

  if (params?.paymentMethod) {
    filtered = filtered.filter((exp) => exp.PaymentMethod === params.paymentMethod);
  }

  if (params?.datePaidNull) {
    filtered = filtered.filter((exp) => exp.DatePaid === undefined || exp.DatePaid === null);
  }

  if (params?.search) {
    const term = params.search.trim().toLowerCase();
    filtered = filtered.filter((exp) =>
      (exp.Expense && exp.Expense.toLowerCase().includes(term)) ||
      (exp.Category && exp.Category.toLowerCase().includes(term)) ||
      (exp.Amount !== undefined && exp.Amount.toString().includes(term))
    );
  }

  return Promise.resolve(filtered.map(toExpense));
}

/**
 * Get a single expense by ID
 */
export async function getExpense(id: number): Promise<Expense | null> {
  const api = mockExpenses.find((exp) => exp.Expense_I === id);
  return Promise.resolve(api ? toExpense(api) : null);
}

/**
 * Update an expense (PATCH)
 */
export async function updateExpense(id: number, updates: Partial<Expense>): Promise<Expense> {
  const index = mockExpenses.findIndex((exp) => exp.Expense_I === id);
  if (index === -1) throw new Error("Expense not found");

  const apiUpdates = partialToApi(updates);
  mockExpenses[index] = { ...mockExpenses[index], ...apiUpdates };
  return Promise.resolve(toExpense(mockExpenses[index]));
}

/**
 * Create a new expense
 */
export async function createExpense(expense: Omit<Expense, "id">): Promise<Expense> {
  const nextId = Math.max(...mockExpenses.map((e) => e.Expense_I)) + 1;
  const api: ApiExpense = {
    Expense_I: nextId,
    ExpenseDate: expense.date,
    Expense: expense.description,
    Amount: expense.amount,
    PaymentMethod: expense.paymentMethod ?? undefined,
    Category: expense.category ?? undefined,
    DatePaid: expense.datePaid ?? undefined,
  };
  mockExpenses.push(api);
  return Promise.resolve(toExpense(api));
}

/**
 * Delete an expense
 */
export async function deleteExpense(id: number): Promise<void> {
  const index = mockExpenses.findIndex((exp) => exp.Expense_I === id);
  if (index !== -1) mockExpenses.splice(index, 1);
  return Promise.resolve();
}

/**
 * Bulk update expenses
 */
export async function bulkUpdateExpenses(ids: number[], updates: Partial<Expense>): Promise<void> {
  const apiUpdates = partialToApi(updates);
  ids.forEach((id) => {
    const index = mockExpenses.findIndex((exp) => exp.Expense_I === id);
    if (index !== -1) mockExpenses[index] = { ...mockExpenses[index], ...apiUpdates };
  });
  return Promise.resolve();
}

/**
 * Bulk delete expenses
 */
export async function bulkDeleteExpenses(ids: number[]): Promise<void> {
  ids.forEach((id) => {
    const index = mockExpenses.findIndex((exp) => exp.Expense_I === id);
    if (index !== -1) mockExpenses.splice(index, 1);
  });
  return Promise.resolve();
}
