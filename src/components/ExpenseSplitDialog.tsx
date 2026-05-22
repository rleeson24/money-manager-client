import { useState, useEffect, useMemo } from "react";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./chatGPTUIComponents";
import ReactSelect, { SingleValue } from "react-select";
import { sanitizeAmountInput, formatAmountForBlur } from "../utils/amountInput";
import { replaceExpenseSplits } from "../services/expenseSplitService";
import type { ExpenseSplit } from "../types/expenseSplit";
import type { Category } from "../services/categoryService";

export interface SplitRow {
  description: string;
  amount: string;
  category: number;
}

interface ExpenseSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: number;
  parentAmount: number;
  initialSplits: ExpenseSplit[];
  categories: Category[];
  onSaveSuccess: (splits: ExpenseSplit[]) => void;
  onCancel: () => void;
}

function toRow(s: ExpenseSplit): SplitRow {
  return {
    description: s.description,
    amount: Number(s.amount).toFixed(2),
    category: s.category,
  };
}

function sumRows(rows: SplitRow[]): number {
  return rows.reduce((a, r) => a + (parseFloat(r.amount) || 0), 0);
}

function isRowComplete(row: SplitRow): boolean {
  const amount = parseFloat(row.amount);
  return row.description.trim() !== "" && Number.isFinite(amount) && amount > 0;
}

function createDraftRow(remaining: number, defaultCategoryId: number): SplitRow {
  return {
    description: "",
    amount: (remaining > 0.005 ? remaining : 0.01).toFixed(2),
    category: defaultCategoryId,
  };
}

function appendDraftRowIfNeeded(
  rows: SplitRow[],
  completedIndex: number,
  parentAmount: number,
  defaultCategoryId: number
): SplitRow[] {
  if (completedIndex !== rows.length - 1) return rows;
  if (!isRowComplete(rows[completedIndex])) return rows;

  const remaining = parentAmount - sumRows(rows);
  if (remaining < 0.005) return rows;

  return [...rows, createDraftRow(remaining, defaultCategoryId)];
}

export function ExpenseSplitDialog({
  open,
  onOpenChange,
  expenseId,
  parentAmount,
  initialSplits,
  categories,
  onSaveSuccess,
  onCancel,
}: ExpenseSplitDialogProps) {
  const [rows, setRows] = useState<SplitRow[]>(() =>
    initialSplits.length > 0
      ? initialSplits.map(toRow)
      : [
          {
            description: "",
            amount: parentAmount.toFixed(2),
            category: categories[0]?.category_I ?? 1,
          },
        ]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => c.name !== "Split")
        .map((c) => ({
          value: String(c.category_I),
          label: c.name,
        })),
    [categories]
  );
  const defaultCategoryId = categories.find((c) => c.name !== "Split")?.category_I ?? categories[0]?.category_I ?? 1;

  useEffect(() => {
    if (open) {
      setRows(
        initialSplits.length > 0
          ? initialSplits.map(toRow)
          : [
              {
                description: "",
                amount: parentAmount.toFixed(2),
                category: categories[0]?.category_I ?? 1,
              },
            ]
      );
      setError(null);
    }
  }, [open, expenseId, parentAmount, initialSplits, categories]);

  const sum = sumRows(rows);
  const remaining = parentAmount - sum;
  const isValid = Math.abs(remaining) < 0.005;

  function updateRow(index: number, field: keyof SplitRow, value: string | number) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function updateRowAndMaybeAppendDraft(index: number, field: keyof SplitRow, value: string | number) {
    setRows((prev) => {
      const updated = prev.map((r, i) => (i === index ? { ...r, [field]: value } : r));
      return appendDraftRowIfNeeded(updated, index, parentAmount, defaultCategoryId);
    });
  }

  function checkRowCompletion(index: number) {
    setRows((prev) => appendDraftRowIfNeeded(prev, index, parentAmount, defaultCategoryId));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      createDraftRow(remaining, defaultCategoryId),
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    setError(null);
    try {
      const items = rows.map((r) => ({
        description: r.description.trim(),
        amount: parseFloat(r.amount) || 0,
        category: r.category,
      }));
      const result = await replaceExpenseSplits(expenseId, items);
      onSaveSuccess(result);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save splits");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    onCancel();
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit split expenses</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              Total: ${parentAmount.toFixed(2)} · Sum: ${sum.toFixed(2)} · Remaining: ${remaining.toFixed(2)}
            </span>
            {!isValid && (
              <span className="text-sm text-amber-600">Amounts must add up to the total</span>
            )}
          </div>
          <div className="border rounded-lg">
            <table className="text-sm w-full">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="text-left p-2 font-medium">Description</th>
                  <th className="text-right p-2 w-28 font-medium">Amount</th>
                  <th className="text-left p-2 w-48 font-medium">Category</th>
                  <th className="w-20 p-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="p-1">
                      <Input
                        value={row.description}
                        onChange={(e) => updateRow(idx, "description", e.target.value)}
                        onBlur={() => checkRowCompletion(idx)}
                        placeholder="Description"
                        className="border-gray-200"
                      />
                    </td>
                    <td className="p-1 text-right">
                      <Input
                        type="text"
                        value={row.amount}
                        onChange={(e) =>
                          updateRow(idx, "amount", sanitizeAmountInput(e.target.value))
                        }
                        onBlur={() => {
                          setRows((prev) => {
                            const updated = prev.map((r, i) =>
                              i === idx ? { ...r, amount: formatAmountForBlur(r.amount) } : r
                            );
                            return appendDraftRowIfNeeded(updated, idx, parentAmount, defaultCategoryId);
                          });
                        }}
                        className="w-24 text-right border-gray-200"
                      />
                    </td>
                    <td className="p-1">
                      <ReactSelect
                        classNamePrefix="cat-select"
                        isSearchable
                        options={categoryOptions}
                        value={
                          categoryOptions.find(
                            (o) => o.value === String(row.category)
                          ) ?? null
                        }
                        onChange={(
                          opt: SingleValue<{ value: string; label: string }>
                        ) =>
                          updateRowAndMaybeAppendDraft(
                            idx,
                            "category",
                            Number(opt?.value ?? row.category)
                          )
                        }
                        styles={{
                          container: (base) => ({ ...base, width: "100%" }),
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          valueContainer: (base) => ({
                            ...base,
                            padding: "0 6px",
                          }),
                          control: (base) => ({
                            ...base,
                            minHeight: 32,
                            borderRadius: 6,
                            borderColor: "#d1d5db",
                          }),
                        }}
                        menuPortalTarget={document.body}
                      />
                    </td>
                    <td className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeRow(idx)}
                        className="!px-2 !py-1 text-xs"
                        disabled={rows.length <= 1}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" onClick={addRow} className="!px-2 !py-1 text-xs">
            Add row
          </Button>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!isValid || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
