import type { Category } from "../services/categoryService";
import type { Expense } from "../types/expense";
import type { ExpenseSplit } from "../types/expenseSplit";

export interface BudgetReportLine {
  categoryId: number | null;
  name: string;
  amount: number;
  percentOfTotal: number;
  transactionCount: number;
  isDirect: boolean;
}

export interface BudgetReportCategory {
  categoryId: number | null;
  name: string;
  amount: number;
  percentOfTotal: number;
  transactionCount: number;
  lines: BudgetReportLine[];
}

export interface BudgetReport {
  month: string;
  totalSpent: number;
  transactionCount: number;
  categories: BudgetReportCategory[];
}

const UNCATEGORIZED_NAME = "Uncategorized";

/**
 * Mock-mode counterpart of MoneyManager.Core.Reports.BudgetReportBuilder.
 * Split expenses count under each split category. Refunds reduce a category.
 * Total spent ignores categories that net to a credit, such as income.
 */
export function buildBudgetReport(
  month: string,
  expenses: Expense[],
  splits: ExpenseSplit[],
  categories: Category[]
): BudgetReport {
  const categoryById = new Map(categories.map((category) => [category.category_I, category]));
  const splitsByExpense = new Map<number, ExpenseSplit[]>();
  for (const split of splits) {
    const list = splitsByExpense.get(split.expense_I) ?? [];
    list.push(split);
    splitsByExpense.set(split.expense_I, list);
  }

  const buckets = new Map<number | null, { amount: number; count: number }>();
  const add = (categoryId: number | null, amount: number) => {
    const current = buckets.get(categoryId) ?? { amount: 0, count: 0 };
    current.amount = roundMoney(current.amount + amount);
    current.count += 1;
    buckets.set(categoryId, current);
  };

  for (const expense of expenses) {
    const expenseId = Number(expense.id);
    const expenseSplits = splitsByExpense.get(expenseId);
    if (expense.isSplit && expenseSplits && expenseSplits.length > 0) {
      for (const split of expenseSplits) add(split.category, split.amount);
    } else {
      add(expense.category ?? null, expense.amount);
    }
  }

  type Group = {
    categoryId: number;
    name: string;
    direct: { amount: number; count: number } | null;
    lines: BudgetReportLine[];
  };

  const groups = new Map<number, Group>();
  const result: BudgetReportCategory[] = [];

  const groupFor = (category: Category): Group => {
    const existing = groups.get(category.category_I);
    if (existing) return existing;
    const created: Group = {
      categoryId: category.category_I,
      name: category.name,
      direct: null,
      lines: [],
    };
    groups.set(category.category_I, created);
    return created;
  };

  for (const [categoryId, bucket] of buckets) {
    if (bucket.amount === 0) continue;

    if (categoryId == null) {
      result.push(leaf(null, UNCATEGORIZED_NAME, bucket));
      continue;
    }

    const category = categoryById.get(categoryId);
    if (!category) {
      result.push(leaf(categoryId, `Unknown category (${categoryId})`, bucket));
      continue;
    }

    const parentId = category.parentCategory_I;
    const parent = parentId != null ? categoryById.get(parentId) : undefined;
    if (parent) {
      groupFor(parent).lines.push(line(category.category_I, category.name, bucket, false));
      continue;
    }

    groupFor(category).direct = bucket;
  }

  for (const group of groups.values()) {
    const built = buildGroup(group);
    if (built) result.push(built);
  }

  const totalSpent = roundMoney(
    result.filter((category) => category.amount > 0).reduce((sum, category) => sum + category.amount, 0)
  );
  for (const category of result) {
    category.percentOfTotal = percentOfSpending(category.amount, totalSpent);
    for (const categoryLine of category.lines) {
      categoryLine.percentOfTotal = percentOfSpending(categoryLine.amount, totalSpent);
    }
  }

  const spending = result.filter((category) => category.amount > 0).sort(byAmountDesc);
  const credits = result.filter((category) => category.amount < 0).sort(byAmountAsc);

  return {
    month,
    totalSpent,
    transactionCount: result.reduce((sum, category) => sum + category.transactionCount, 0),
    categories: [...spending, ...credits],
  };
}

function buildGroup(group: {
  categoryId: number;
  name: string;
  direct: { amount: number; count: number } | null;
  lines: BudgetReportLine[];
}): BudgetReportCategory | null {
  const lines = [...group.lines];
  if (group.direct && lines.length > 0) {
    lines.push(line(group.categoryId, group.name, group.direct, true));
  }
  lines.sort(byAmountDesc);

  if (lines.length === 0) {
    if (!group.direct || group.direct.amount === 0) return null;
    return {
      categoryId: group.categoryId,
      name: group.name,
      amount: group.direct.amount,
      percentOfTotal: 0,
      transactionCount: group.direct.count,
      lines: [],
    };
  }

  const amount = roundMoney(lines.reduce((sum, categoryLine) => sum + categoryLine.amount, 0));
  if (amount === 0) return null;
  return {
    categoryId: group.categoryId,
    name: group.name,
    amount,
    percentOfTotal: 0,
    transactionCount: lines.reduce((sum, categoryLine) => sum + categoryLine.transactionCount, 0),
    lines,
  };
}

function leaf(
  categoryId: number | null,
  name: string,
  bucket: { amount: number; count: number }
): BudgetReportCategory {
  return {
    categoryId,
    name,
    amount: bucket.amount,
    percentOfTotal: 0,
    transactionCount: bucket.count,
    lines: [],
  };
}

function line(
  categoryId: number | null,
  name: string,
  bucket: { amount: number; count: number },
  isDirect: boolean
): BudgetReportLine {
  return {
    categoryId,
    name,
    amount: bucket.amount,
    percentOfTotal: 0,
    transactionCount: bucket.count,
    isDirect,
  };
}

function percentOfSpending(amount: number, totalSpent: number): number {
  if (totalSpent <= 0 || amount <= 0) return 0;
  return Math.round((amount / totalSpent) * 1000) / 10;
}

function byAmountDesc(a: { amount: number; name: string }, b: { amount: number; name: string }): number {
  if (a.amount !== b.amount) return b.amount - a.amount;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function byAmountAsc(a: { amount: number; name: string }, b: { amount: number; name: string }): number {
  if (a.amount !== b.amount) return a.amount - b.amount;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
