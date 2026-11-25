import { USE_API, apiJson } from "../config/api";
import { getCategories } from "./categoryService";
import { getExpenses } from "./expenseService";
import { getExpenseSplits } from "./expenseSplitService";
import {
  buildBudgetReport,
  type BudgetReport,
  type BudgetReportCategory,
  type BudgetReportLine,
} from "../utils/budgetReport";

export type { BudgetReport, BudgetReportCategory, BudgetReportLine };

export async function getBudgetReport(month: string, signal?: AbortSignal): Promise<BudgetReport> {
  if (USE_API) {
    const data = await apiJson<BudgetReport>(
      `/api/reports/budget?month=${encodeURIComponent(month)}`,
      { signal },
      "Failed to load budget report"
    );
    if (!data) throw new Error("Failed to load budget report");
    return {
      month: data.month,
      totalSpent: data.totalSpent,
      transactionCount: data.transactionCount,
      categories: (data.categories ?? []).map((category) => ({
        ...category,
        lines: category.lines ?? [],
      })),
    };
  }

  const [expenses, categories] = await Promise.all([
    getExpenses({ month, signal }),
    getCategories(signal, false),
  ]);
  const splitExpenses = expenses.filter((expense) => expense.isSplit);
  const splits = (
    await Promise.all(splitExpenses.map((expense) => getExpenseSplits(Number(expense.id))))
  ).flat();
  return buildBudgetReport(month, expenses, splits, categories);
}
