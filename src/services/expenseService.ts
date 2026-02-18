import { USE_API, API_BASE } from "../config/api";
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
  expense_I: number;
  expenseDate: string;
  expense: string;
  amount: number;
  paymentMethod?: number;
  category?: number;
  datePaid?: string;
  createdDateTime?: string;
  modifiedDateTime?: string;
}

function toExpense(api: ApiExpense): Expense {
  return {
    id: api.expense_I,
    date: api.expenseDate,
    description: api.expense,
    amount: api.amount,
    paymentMethod: api.paymentMethod ?? null,
    category: api.category ?? null,
    datePaid: api.datePaid ?? null,
    createdDateTime: api.createdDateTime,
    modifiedDateTime: api.modifiedDateTime,
  };
}

function expenseToApiBody(expense: Omit<Expense, "id"> | Partial<Expense>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if ("date" in expense && expense.date !== undefined) body.ExpenseDate = expense.date;
  if ("description" in expense && expense.description !== undefined) body.Expense = expense.description;
  if ("amount" in expense && expense.amount !== undefined) body.Amount = expense.amount;
  if ("paymentMethod" in expense && expense.paymentMethod !== undefined) body.PaymentMethod = expense.paymentMethod;
  if ("category" in expense && expense.category !== undefined) body.Category = expense.category;
  if ("datePaid" in expense && expense.datePaid !== undefined) body.DatePaid = expense.datePaid;
  if ("createdDateTime" in expense && expense.createdDateTime !== undefined) body.CreatedDateTime = expense.createdDateTime;
  if ("modifiedDateTime" in expense && expense.modifiedDateTime !== undefined) body.ModifiedDateTime = expense.modifiedDateTime;
  return body;
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  return fetch(`${API_BASE}${path}`, { ...options, credentials: "include", headers });
}

// ---------- Mock data (used when USE_API is false) ----------
const mockExpenses: ApiExpense[] = [
  { expense_I: 1, expenseDate: "2026-01-19T00:00:00", expense: "COPA AIRLINES PANAMA PAN", amount: 126.34, paymentMethod: 1, category: 1, datePaid: undefined, createdDateTime: "2026-01-19T12:00:00Z", modifiedDateTime: "2026-01-19T12:00:00Z" },
  { expense_I: 2, expenseDate: "2026-01-22T00:00:00", expense: "Freddy's - custard", amount: 5.51, paymentMethod: 1, category: 2, datePaid: undefined, createdDateTime: "2026-01-22T12:00:00Z", modifiedDateTime: "2026-01-22T12:00:00Z" },
  { expense_I: 3, expenseDate: "2026-01-22T00:00:00", expense: "WALMART.COM - David birthday present - couch", amount: 83.30, paymentMethod: 1, category: 3, datePaid: undefined, createdDateTime: "2026-01-22T12:00:00Z", modifiedDateTime: "2026-01-22T12:00:00Z" },
  { expense_I: 4, expenseDate: "2026-01-23T00:00:00", expense: "Gas Station", amount: 45.0, paymentMethod: 1, category: 4, datePaid: undefined, createdDateTime: "2026-01-23T12:00:00Z", modifiedDateTime: "2026-01-23T12:00:00Z" },
  { expense_I: 5, expenseDate: "2026-01-24T00:00:00", expense: "Ross - return lita shoes", amount: 21.79, paymentMethod: 1, category: 1, datePaid: undefined, createdDateTime: "2026-01-24T12:00:00Z", modifiedDateTime: "2026-01-24T12:00:00Z" },
  { expense_I: 6, expenseDate: "2026-01-25T00:00:00", expense: "AMAZON - Luca Christmas gift", amount: 15.99, paymentMethod: 1, category: 8, datePaid: undefined, createdDateTime: "2026-01-25T12:00:00Z", modifiedDateTime: "2026-01-25T12:00:00Z" },
  { expense_I: 7, expenseDate: "2026-01-26T00:00:00", expense: "Pharmacy - Prescription", amount: 32.5, paymentMethod: 1, category: 5, datePaid: undefined, createdDateTime: "2026-01-26T12:00:00Z", modifiedDateTime: "2026-01-26T12:00:00Z" },
  { expense_I: 8, expenseDate: "2026-01-27T00:00:00", expense: "Groceries - Whole Foods", amount: 125.5, paymentMethod: 1, category: 6, datePaid: undefined, createdDateTime: "2026-01-27T12:00:00Z", modifiedDateTime: "2026-01-27T12:00:00Z" },
  { expense_I: 9, expenseDate: "2026-01-28T00:00:00", expense: "Outdoor Equipment", amount: 89.25, paymentMethod: 1, category: 7, datePaid: undefined, createdDateTime: "2026-01-28T12:00:00Z", modifiedDateTime: "2026-01-28T12:00:00Z" },
];

let lastMockConflictModified: string | null = null;

export type { Expense };

/**
 * Get expenses with optional filters.
 * When USE_API: GET /api/expenses (month, paymentMethod, datePaidNull). Search is applied client-side if provided.
 */
export async function getExpenses(params?: {
  month?: string;
  search?: string;
  paymentMethod?: number;
  datePaidNull?: boolean;
}): Promise<Expense[]> {
  if (USE_API) {
    const searchParams = new URLSearchParams();
    if (params?.month) searchParams.set("month", params.month);
    if (params?.paymentMethod != null) searchParams.set("paymentMethod", String(params.paymentMethod));
    if (params?.datePaidNull != null) searchParams.set("datePaidNull", String(params.datePaidNull));
    const qs = searchParams.toString();
    const res = await apiFetch(`/api/expenses${qs ? `?${qs}` : ""}`);
    if (!res.ok) throw new Error(`Failed to fetch expenses: ${res.status}`);
    const data = (await res.json()) as ApiExpense[];
    let list = (Array.isArray(data) ? data : []).map(toExpense);
    if (params?.search?.trim()) {
      const term = params.search.trim().toLowerCase();
      list = list.filter(
        (exp) =>
          (exp.description && exp.description.toLowerCase().includes(term)) ||
          (exp.category != null && String(exp.category).includes(term)) ||
          (exp.amount != null && String(exp.amount).includes(term))
      );
    }
    return list;
  }

  let filtered = [...mockExpenses];
  if (params?.month) filtered = filtered.filter((exp) => exp.expenseDate.substring(0, 7) === params.month);
  if (params?.paymentMethod != null) filtered = filtered.filter((exp) => exp.paymentMethod === params.paymentMethod);
  if (params?.datePaidNull) filtered = filtered.filter((exp) => exp.datePaid == null);
  if (params?.search?.trim()) {
    const term = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (exp) =>
        (exp.expense && exp.expense.toLowerCase().includes(term)) ||
        (exp.category != null && exp.category.toString().includes(term)) ||
        (exp.amount != null && exp.amount.toString().includes(term))
    );
  }
  return filtered.map(toExpense);
}

/**
 * Get a single expense by ID.
 * When USE_API: GET /api/expenses/{id}
 */
export async function getExpense(id: number): Promise<Expense | null> {
  if (USE_API) {
    const res = await apiFetch(`/api/expenses/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch expense: ${res.status}`);
    const data = (await res.json()) as ApiExpense;
    return toExpense(data);
  }
  const api = mockExpenses.find((exp) => exp.expense_I === id);
  return api ? toExpense(api) : null;
}

/**
 * Update an expense (PATCH).
 * When USE_API: PATCH /api/expenses/{id}. On 409, throws UpdateConflictError with current expense.
 */
export async function updateExpense(id: number, updates: Partial<Expense>): Promise<Expense> {
  if (USE_API) {
    const body = expenseToApiBody(updates);
    const res = await apiFetch(`/api/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as ApiExpense & { title?: string };
    if (res.status === 409 && data.expense_I != null) {
      throw new UpdateConflictError("Expense was updated by someone else.", toExpense(data as ApiExpense));
    }
    if (!res.ok) throw new Error(data?.title ?? `Update failed: ${res.status}`);
    return toExpense(data as ApiExpense);
  }

  const index = mockExpenses.findIndex((exp) => exp.expense_I === id);
  if (index === -1) throw new Error("Expense not found");
  if (updates.modifiedDateTime && lastMockConflictModified && updates.modifiedDateTime === lastMockConflictModified) {
    lastMockConflictModified = null;
    Object.assign(mockExpenses[index], {
      expenseDate: updates.date ?? mockExpenses[index].expenseDate,
      expense: updates.description ?? mockExpenses[index].expense,
      amount: updates.amount ?? mockExpenses[index].amount,
      paymentMethod: updates.paymentMethod ?? mockExpenses[index].paymentMethod,
      category: updates.category ?? mockExpenses[index].category,
      datePaid: updates.datePaid ?? mockExpenses[index].datePaid,
      modifiedDateTime: new Date().toISOString(),
    });
    return toExpense(mockExpenses[index]);
  }
  // Optional: set to true to simulate 409 on first update for testing
  const mockConflictForTest = false;
  if (mockConflictForTest) {
    const serverModified = new Date(Date.now() - 60000).toISOString();
    lastMockConflictModified = serverModified;
    const currentFromServer = toExpense(mockExpenses[index]);
    throw new UpdateConflictError("Expense was updated by someone else.", {
      ...currentFromServer,
      modifiedDateTime: serverModified,
      description: currentFromServer.description + " (updated elsewhere)",
    });
  }
  Object.assign(mockExpenses[index], {
    expenseDate: updates.date ?? mockExpenses[index].expenseDate,
    expense: updates.description ?? mockExpenses[index].expense,
    amount: updates.amount ?? mockExpenses[index].amount,
    paymentMethod: updates.paymentMethod ?? mockExpenses[index].paymentMethod,
    category: updates.category ?? mockExpenses[index].category,
    datePaid: updates.datePaid ?? mockExpenses[index].datePaid,
    modifiedDateTime: new Date().toISOString(),
  });
  return toExpense(mockExpenses[index]);
}

/**
 * Create a new expense.
 * When USE_API: POST /api/expenses
 */
export async function createExpense(expense: Omit<Expense, "id">): Promise<Expense> {
  if (USE_API) {
    const body = expenseToApiBody(expense);
    const res = await apiFetch("/api/expenses", { method: "POST", body: JSON.stringify(body) });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { title?: string };
      throw new Error(err?.title ?? `Create failed: ${res.status}`);
    }
    const data = (await res.json()) as ApiExpense;
    return toExpense(data);
  }
  const nextId = Math.max(0, ...mockExpenses.map((e) => e.expense_I)) + 1;
  const now = new Date().toISOString();
  const api: ApiExpense = {
    expense_I: nextId,
    expenseDate: expense.date,
    expense: expense.description,
    amount: expense.amount,
    paymentMethod: expense.paymentMethod ?? undefined,
    category: expense.category ?? undefined,
    datePaid: expense.datePaid ?? undefined,
    createdDateTime: now,
    modifiedDateTime: now,
  };
  mockExpenses.push(api);
  return toExpense(api);
}

/**
 * Delete an expense.
 * When USE_API: DELETE /api/expenses/{id}
 */
export async function deleteExpense(id: number): Promise<void> {
  if (USE_API) {
    const res = await apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error(`Delete failed: ${res.status}`);
    return;
  }
  const index = mockExpenses.findIndex((exp) => exp.expense_I === id);
  if (index !== -1) mockExpenses.splice(index, 1);
}

/**
 * Bulk update expenses.
 * When USE_API: PATCH /api/expenses/bulk with body { Ids, ExpenseDate?, Category?, setCategoryToNull?, DatePaid?, setDatePaidToNull? }
 */
export async function bulkUpdateExpenses(ids: number[], updates: Partial<Expense>): Promise<void> {
  if (USE_API) {
    const body: Record<string, unknown> = { Ids: ids };
    if (updates.date != null) body.ExpenseDate = updates.date;
    if (updates.category !== undefined) body.Category = updates.category;
    if (updates.datePaid !== undefined) body.DatePaid = updates.datePaid;
    const res = await apiFetch("/api/expenses/bulk", { method: "PATCH", body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Bulk update failed: ${res.status}`);
    return;
  }
  const patch = expenseToApiBody(updates);
  ids.forEach((id) => {
    const index = mockExpenses.findIndex((exp) => exp.expense_I === id);
    if (index !== -1) {
      if (patch.ExpenseDate != null) mockExpenses[index].expenseDate = patch.ExpenseDate as string;
      if (patch.Category !== undefined) mockExpenses[index].category = patch.Category as number;
      if (patch.DatePaid !== undefined) mockExpenses[index].datePaid = patch.DatePaid as string;
      mockExpenses[index].modifiedDateTime = new Date().toISOString();
    }
  });
}

/**
 * Bulk delete expenses.
 * When USE_API: DELETE /api/expenses/bulk with body { Ids }
 */
export async function bulkDeleteExpenses(ids: number[]): Promise<void> {
  if (USE_API) {
    const res = await apiFetch("/api/expenses/bulk", { method: "DELETE", body: JSON.stringify({ Ids: ids }) });
    if (!res.ok) throw new Error(`Bulk delete failed: ${res.status}`);
    return;
  }
  ids.forEach((id) => {
    const index = mockExpenses.findIndex((exp) => exp.expense_I === id);
    if (index !== -1) mockExpenses.splice(index, 1);
  });
}
