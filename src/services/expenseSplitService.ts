import { USE_API, apiJson, ApiError } from "../config/api";
import type { ExpenseSplit, CreateOrUpdateExpenseSplit } from "../types/expenseSplit";

/** Mock data when not using API */
const mockSplits: ExpenseSplit[] = [];

/**
 * Get splits for a parent expense.
 * When USE_API: GET /api/expenses/split?expenseId={expenseId}
 */
export async function getExpenseSplits(expenseId: number): Promise<ExpenseSplit[]> {
  if (USE_API) {
    const data = await apiJson<ExpenseSplit[]>(
      `/api/expenses/split?expenseId=${expenseId}`,
      {},
      "Failed to fetch expense splits"
    );
    return Array.isArray(data) ? data : [];
  }
  return mockSplits.filter((s) => s.expense_I === expenseId);
}

/**
 * Create a split line.
 * When USE_API: POST /api/expenses/split
 */
function toApiBody(model: CreateOrUpdateExpenseSplit): Record<string, unknown> {
  return { Expense_I: model.expense_I, Description: model.description, Amount: model.amount, Category: model.category };
}

export async function createExpenseSplit(model: CreateOrUpdateExpenseSplit): Promise<ExpenseSplit> {
  if (USE_API) {
    const data = await apiJson<ExpenseSplit>(
      "/api/expenses/split",
      {
        method: "POST",
        body: JSON.stringify(toApiBody(model)),
      },
      "Failed to create expense split"
    );
    if (!data) throw new Error("Create failed: no response body");
    return data;
  }
  const nextId = mockSplits.length > 0 ? Math.max(...mockSplits.map((s) => s.id)) + 1 : 1;
  const split: ExpenseSplit = {
    id: nextId,
    expense_I: model.expense_I,
    description: model.description,
    amount: model.amount,
    category: model.category,
    createdDateTime: new Date().toISOString(),
  };
  mockSplits.push(split);
  return split;
}

/**
 * Update a split line.
 * When USE_API: PUT /api/expenses/split/{id}
 */
export async function updateExpenseSplit(
  id: number,
  model: CreateOrUpdateExpenseSplit
): Promise<ExpenseSplit> {
  if (USE_API) {
    const data = await apiJson<ExpenseSplit>(
      `/api/expenses/split/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(toApiBody(model)),
      },
      "Failed to update expense split"
    );
    if (!data) throw new Error("Update failed: no response body");
    return data;
  }
  const index = mockSplits.findIndex((s) => s.id === id);
  if (index === -1) throw new Error("Split not found");
  const updated: ExpenseSplit = { ...mockSplits[index], ...model };
  mockSplits[index] = updated;
  return updated;
}

/**
 * Delete a split line.
 * When USE_API: DELETE /api/expenses/split/{id}
 */
export async function deleteExpenseSplit(id: number): Promise<void> {
  if (USE_API) {
    try {
      await apiJson(`/api/expenses/split/${id}`, { method: "DELETE" }, "Failed to delete expense split");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return;
      throw e;
    }
    return;
  }
  const index = mockSplits.findIndex((s) => s.id === id);
  if (index !== -1) mockSplits.splice(index, 1);
}

/** Item for replace (no id); API expects Description, Amount, Category */
export interface ReplaceExpenseSplitItem {
  description: string;
  amount: number;
  category: number;
}

/**
 * Replace all splits for an expense. Sum of amounts must equal parent total.
 * When USE_API: PUT /api/expenses/split/replace?expenseId={id}
 */
export async function replaceExpenseSplits(
  expenseId: number,
  items: ReplaceExpenseSplitItem[]
): Promise<ExpenseSplit[]> {
  if (USE_API) {
    const body = {
      Splits: items.map((i) => ({
        Description: i.description,
        Amount: i.amount,
        Category: i.category,
      })),
    };
    const data = await apiJson<ExpenseSplit[]>(
      `/api/expenses/split/replace?expenseId=${expenseId}`,
      { method: "PUT", body: JSON.stringify(body) },
      "Failed to save splits"
    );
    return Array.isArray(data) ? data : [];
  }
  mockSplits.splice(0, mockSplits.length, ...mockSplits.filter((s) => s.expense_I !== expenseId));
  let nextId = mockSplits.length > 0 ? Math.max(...mockSplits.map((s) => s.id)) + 1 : 1;
  const created: ExpenseSplit[] = [];
  for (const i of items) {
    const split: ExpenseSplit = {
      id: nextId++,
      expense_I: expenseId,
      description: i.description,
      amount: i.amount,
      category: i.category,
      createdDateTime: new Date().toISOString(),
    };
    mockSplits.push(split);
    created.push(split);
  }
  return created;
}
