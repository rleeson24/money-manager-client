import { useState, useEffect } from "react";
import { getExpenseSplits } from "../services/expenseSplitService";
import type { ExpenseSplit } from "../types/expenseSplit";
import type { Category } from "../services/categoryService";

interface ExpenseSplitReadonlyGridProps {
  expenseId: number;
  parentAmount: number;
  categories: Category[];
  onEditClick: (splits: ExpenseSplit[]) => void;
  refreshKey?: number;
}

/** Pencil icon (simple SVG) */
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "w-4 h-4"}
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export function ExpenseSplitReadonlyGrid({
  expenseId,
  parentAmount,
  categories,
  onEditClick,
  refreshKey = 0,
}: ExpenseSplitReadonlyGridProps) {
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getExpenseSplits(expenseId)
      .then((data) => {
        if (!cancelled) setSplits(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load splits");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [expenseId, refreshKey]);

  const sum = splits.reduce((s, sp) => s + (sp.amount ?? 0), 0);

  if (loading) return <div className="p-3 text-sm text-gray-500">Loading splits…</div>;
  if (error) return <div className="p-3 text-sm text-red-600">{error}</div>;

  return (
    <div className="border-t border-gray-200 bg-gray-50/60 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-medium">
          Sum: ${sum.toFixed(2)} / Total: ${parentAmount.toFixed(2)}
        </span>
        <button
          type="button"
          onClick={() => onEditClick(splits)}
          className="shrink-0 p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Edit splits"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="w-full md:w-fit max-w-full overflow-x-auto border rounded overflow-hidden bg-white">
        <table className="text-sm table-auto min-w-0">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="text-left p-2 font-medium min-w-[20rem]">Description</th>
              <th className="text-right p-2 w-28 font-medium">Amount</th>
              <th className="text-left p-2 min-w-[8rem] font-medium">Category</th>
            </tr>
          </thead>
          <tbody>
            {splits.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-3 text-gray-500 italic">
                  No split lines. Click Edit to add.
                </td>
              </tr>
            ) : (
              splits.map((sp) => (
                <tr key={sp.id} className="border-b last:border-b-0">
                  <td className="p-2">{sp.description || "—"}</td>
                  <td className="p-2 text-right">${Number(sp.amount).toFixed(2)}</td>
                  <td className="p-2">
                    {categories.find((c) => c.category_I === sp.category)?.name ?? sp.category}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
