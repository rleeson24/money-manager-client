import type { Expense } from "../types/expense";

/** Thrown when the server returns 409 Conflict (expense was already updated). */
export class UpdateConflictError extends Error {
  constructor(
    message: string,
    public readonly currentExpense: Expense
  ) {
    super(message);
    this.name = "UpdateConflictError";
  }
}

/** API response shape (Expense_I, ExpenseDate, etc.) */
interface ApiExpense {
  Expense_I: number;
  ExpenseDate: string;
  Expense: string;
  Amount: number;
  PaymentMethod?: number;
  Category?: string;
  DatePaid?: string;
  CreatedDateTime?: string;
  ModifiedDateTime?: string;
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
    createdDateTime: api.CreatedDateTime,
    modifiedDateTime: api.ModifiedDateTime,
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
  if (updates.createdDateTime !== undefined) api.CreatedDateTime = updates.createdDateTime;
  if (updates.modifiedDateTime !== undefined) api.ModifiedDateTime = updates.modifiedDateTime;
  return api;
}

const API_BASE = "";

async function getAuthHeaders(): Promise<HeadersInit> {
  // Use same auth as your app (e.g. from MSAL or cookie). Adjust as needed.
  return { "Content-Type": "application/json" };
}

// Mock data in API shape (include timestamps for concurrency)
const mockExpenses: ApiExpense[] = [
  { Expense_I: 1, ExpenseDate: "2026-01-19T00:00:00", Expense: "COPA AIRLINES PANAMA PAN", Amount: 126.34, PaymentMethod: 1, Category: "Other Expenses (Pare)", DatePaid: undefined, CreatedDateTime: "2026-01-19T12:00:00Z", ModifiedDateTime: "2026-01-19T12:00:00Z" },
  { Expense_I: 2, ExpenseDate: "2026-01-22T00:00:00", Expense: "Freddy's - custard", Amount: 5.51, PaymentMethod: 1, Category: "Dining/Eating Out", DatePaid: undefined, CreatedDateTime: "2026-01-22T12:00:00Z", ModifiedDateTime: "2026-01-22T12:00:00Z" },
  { Expense_I: 3, ExpenseDate: "2026-01-22T00:00:00", Expense: "WALMART.COM - David birthday present - couch", Amount: 83.30, PaymentMethod: 1, Category: "Special Occasions (P)", DatePaid: undefined, CreatedDateTime: "2026-01-22T12:00:00Z", ModifiedDateTime: "2026-01-22T12:00:00Z" },
  { Expense_I: 4, ExpenseDate: "2026-01-23T00:00:00", Expense: "Gas Station", Amount: 45.0, PaymentMethod: 1, Category: "Gas - Auto", DatePaid: undefined, CreatedDateTime: "2026-01-23T12:00:00Z", ModifiedDateTime: "2026-01-23T12:00:00Z" },
  { Expense_I: 5, ExpenseDate: "2026-01-24T00:00:00", Expense: "Ross - return lita shoes", Amount: 21.79, PaymentMethod: 1, Category: "Other Expenses (Pare)", DatePaid: undefined, CreatedDateTime: "2026-01-24T12:00:00Z", ModifiedDateTime: "2026-01-24T12:00:00Z" },
  { Expense_I: 6, ExpenseDate: "2026-01-25T00:00:00", Expense: "AMAZON - Luca Christmas gift", Amount: 15.99, PaymentMethod: 1, Category: "Gifts (Parent)", DatePaid: undefined, CreatedDateTime: "2026-01-25T12:00:00Z", ModifiedDateTime: "2026-01-25T12:00:00Z" },
  { Expense_I: 7, ExpenseDate: "2026-01-26T00:00:00", Expense: "Pharmacy - Prescription", Amount: 32.5, PaymentMethod: 1, Category: "Health", DatePaid: undefined, CreatedDateTime: "2026-01-26T12:00:00Z", ModifiedDateTime: "2026-01-26T12:00:00Z" },
  { Expense_I: 8, ExpenseDate: "2026-01-27T00:00:00", Expense: "Groceries - Whole Foods", Amount: 125.5, PaymentMethod: 1, Category: "Groceries (Parent)", DatePaid: undefined, CreatedDateTime: "2026-01-27T12:00:00Z", ModifiedDateTime: "2026-01-27T12:00:00Z" },
  { Expense_I: 9, ExpenseDate: "2026-01-28T00:00:00", Expense: "Outdoor Equipment", Amount: 89.25, PaymentMethod: 1, Category: "Outdoors (Parent)", DatePaid: undefined, CreatedDateTime: "2026-01-28T12:00:00Z", ModifiedDateTime: "2026-01-28T12:00:00Z" },
];

/** When mocking conflict, remember the server modified we sent so "Yes" retry can succeed */
let lastMockConflictModified: string | null = null;

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

/** Set true to simulate 409 conflict on every first update (mock path) for quick testing. Set false for production. */
const MOCK_CONFLICT_FOR_TEST = true;

/**
 * Update an expense (PATCH). Uses real API when API_BASE is set or when using relative /api.
 * On 409 Conflict, throws UpdateConflictError with the current expense from the server.
 */
export async function updateExpense(id: number, updates: Partial<Expense>): Promise<Expense> {
  const useRealApi = typeof fetch !== "undefined" && !MOCK_CONFLICT_FOR_TEST;
  if (useRealApi) {
    try {
      const headers = await getAuthHeaders();
      const body = partialToApi(updates);
      const res = await fetch(`${API_BASE}/api/expenses/${id}`, {
        method: "PATCH",
        headers: headers as Record<string, string>,
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.Expense_I != null) {
        throw new UpdateConflictError("Expense was updated by someone else.", toExpense(data as ApiExpense));
      }
      if (!res.ok) throw new Error(data?.title || `Update failed: ${res.status}`);
      return toExpense(data as ApiExpense);
    } catch (e) {
      if (e instanceof UpdateConflictError) throw e;
      throw e;
    }
  }

  // Mock path
  const index = mockExpenses.findIndex((exp) => exp.Expense_I === id);
  if (index === -1) throw new Error("Expense not found");

  // Simulate 409 conflict for quick testing: throw on first attempt, succeed when retry sends server's modifiedDateTime
  if (MOCK_CONFLICT_FOR_TEST) {
    const currentFromServer = toExpense(mockExpenses[index]);
    // If caller sent modifiedDateTime matching the one we last sent in a conflict, treat as "Yes" retry and succeed
    if (updates.modifiedDateTime && lastMockConflictModified && updates.modifiedDateTime === lastMockConflictModified) {
      lastMockConflictModified = null;
      const apiUpdates = partialToApi(updates);
      mockExpenses[index] = { ...mockExpenses[index], ...apiUpdates, ModifiedDateTime: new Date().toISOString() };
      return Promise.resolve(toExpense(mockExpenses[index]));
    }
    const serverModified = new Date(Date.now() - 60000).toISOString(); // 1 min ago
    lastMockConflictModified = serverModified;
    const conflictRecord: Expense = {
      ...currentFromServer,
      modifiedDateTime: serverModified,
      description: currentFromServer.description + " (updated elsewhere)",
    };
    throw new UpdateConflictError("Expense was updated by someone else.", conflictRecord);
  }

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
