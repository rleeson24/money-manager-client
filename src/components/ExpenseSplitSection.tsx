import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "./chatGPTUIComponents";
import ReactSelect, { SingleValue } from "react-select";
import { sanitizeAmountInput, formatAmountForBlur } from "../utils/amountInput";
import {
  getExpenseSplits,
  createExpenseSplit,
  updateExpenseSplit,
  deleteExpenseSplit,
} from "../services/expenseSplitService";
import type { ExpenseSplit, CreateOrUpdateExpenseSplit } from "../types/expenseSplit";
import type { Category } from "../services/categoryService";

interface ExpenseSplitSectionProps {
  expenseId: number;
  parentAmount: number;
  categories: Category[];
  onSplitsChange?: (splits: ExpenseSplit[]) => void;
}

export function ExpenseSplitSection({
  expenseId,
  parentAmount,
  categories,
  onSplitsChange,
}: ExpenseSplitSectionProps) {
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ description: string; amount: string; category: number }>(() => ({
    description: "",
    amount: "",
    category: categories[0]?.category_I ?? 1,
  }));
  const [editingAmountBySplitId, setEditingAmountBySplitId] = useState<Record<number, string>>({});
  const [focusedSplitAmountId, setFocusedSplitAmountId] = useState<number | null>(null);
  const descriptionRef = useRef<HTMLInputElement | null>(null);

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: String(c.category_I),
        label: c.name,
      })),
    [categories]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getExpenseSplits(expenseId)
      .then((data) => {
        if (!cancelled) {
          setSplits(data);
          onSplitsChange?.(data);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load splits");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [expenseId, onSplitsChange]);

  const sum = splits.reduce((s, sp) => s + (sp.amount ?? 0), 0);
  const remaining = parentAmount - sum;

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.focus();
    }
  }, [splits.length]);

  // Reset draft amount when remaining changes (e.g. after load or after add/delete)
  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      amount: (remaining > 0 ? remaining : 0.01).toFixed(2),
    }));
  }, [remaining]);

  async function handleAdd() {
    const amountNum = parseFloat(draft.amount) || 0.01;
    const model: CreateOrUpdateExpenseSplit = {
      expense_I: expenseId,
      description: draft.description.trim() || "",
      amount: amountNum > 0 ? amountNum : 0.01,
      category: draft.category,
    };
    try {
      const created = await createExpenseSplit(model);
      setSplits((prev) => [...prev, created]);
      onSplitsChange?.([...splits, created]);
      setDraft((prev) => ({ ...prev, description: "" }));
      descriptionRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add split");
    }
  }

  async function handleUpdate(id: number, field: keyof CreateOrUpdateExpenseSplit, value: string | number) {
    const existing = splits.find((s) => s.id === id);
    if (!existing) return;
    const model: CreateOrUpdateExpenseSplit = {
      expense_I: expenseId,
      description: field === "description" ? String(value) : existing.description,
      amount: field === "amount" ? Number(value) : existing.amount,
      category: field === "category" ? Number(value) : existing.category,
    };
    try {
      const updated = await updateExpenseSplit(id, model);
      setSplits((prev) => prev.map((s) => (s.id === id ? updated : s)));
      onSplitsChange?.(splits.map((s) => (s.id === id ? updated : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update split");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteExpenseSplit(id);
      setSplits((prev) => prev.filter((s) => s.id !== id));
      onSplitsChange?.(splits.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete split");
    }
  }

  if (loading) return <div className="p-2 text-sm text-gray-500">Loading splits...</div>;
  if (error) return <div className="p-2 text-sm text-red-600">{error}</div>;

  return (
    <div className="border-t border-gray-200 bg-gray-50/60 p-3">
      <div className="flex items-center justify-end mb-2">
        <span className="text-sm font-semibold">
          Sum: ${sum.toFixed(2)} / Remaining: ${remaining.toFixed(2)}
        </span>
      </div>
      <div className="space-y-2">
        {splits.map((sp, idx) => (
          <div key={sp.id} className="flex flex-wrap items-center gap-2">
            <Input
              ref={idx === splits.length - 1 && draft.description === "" ? descriptionRef : undefined}
              value={sp.description}
              onChange={(e) => handleUpdate(sp.id, "description", e.target.value)}
              placeholder="Description"
              className="flex-1 min-w-[120px]"
            />
            <Input
              type="text"
              value={
                focusedSplitAmountId === sp.id && editingAmountBySplitId[sp.id] !== undefined
                  ? editingAmountBySplitId[sp.id]
                  : Number(sp.amount).toFixed(2)
              }
              onFocus={() => {
                setFocusedSplitAmountId(sp.id);
                setEditingAmountBySplitId((prev) => ({
                  ...prev,
                  [sp.id]: Number(sp.amount).toFixed(2),
                }));
              }}
              onChange={(e) => {
                setEditingAmountBySplitId((prev) => ({
                  ...prev,
                  [sp.id]: sanitizeAmountInput(e.target.value),
                }));
              }}
              onBlur={() => {
                const raw =
                  focusedSplitAmountId === sp.id ? editingAmountBySplitId[sp.id] ?? "" : "";
                const formatted = formatAmountForBlur(raw);
                const n = parseFloat(formatted);
                if (formatted !== "" && !Number.isNaN(n)) {
                  handleUpdate(sp.id, "amount", n);
                }
                setEditingAmountBySplitId((prev) => {
                  const next = { ...prev };
                  delete next[sp.id];
                  return next;
                });
                setFocusedSplitAmountId((prev) => (prev === sp.id ? null : prev));
              }}
              className="w-24 text-right"
            />
            <ReactSelect
              classNamePrefix="cat-select"
              isSearchable
              options={categoryOptions}
              value={
                categoryOptions.find(
                  (o) => o.value === String(sp.category)
                ) ?? null
              }
              onChange={(
                opt: SingleValue<{ value: string; label: string }>
              ) => handleUpdate(sp.id, "category", Number(opt?.value ?? sp.category))}
              styles={{
                container: (base) => ({ ...base, minWidth: 140 }),
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleDelete(sp.id)}
              className="!px-2 !py-1 text-xs"
            >
              Delete
            </Button>
          </div>
        ))}
        {/* Draft row: always shown when section is visible */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={splits.length === 0 ? descriptionRef : undefined}
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
            className="flex-1 min-w-[120px]"
          />
          <Input
            type="text"
            value={draft.amount}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, amount: sanitizeAmountInput(e.target.value) }))
            }
            onBlur={() => {
              setDraft((prev) => ({ ...prev, amount: formatAmountForBlur(prev.amount) }));
            }}
            className="w-24 text-right"
          />
          <ReactSelect
            classNamePrefix="cat-select"
            isSearchable
            options={categoryOptions}
            value={
              categoryOptions.find(
                (o) => o.value === String(draft.category)
              ) ?? null
            }
            onChange={(
              opt: SingleValue<{ value: string; label: string }>
            ) =>
              setDraft((prev) => ({
                ...prev,
                category: Number(opt?.value ?? prev.category),
              }))
            }
            styles={{
              container: (base) => ({ ...base, minWidth: 140 }),
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
          <Button
            type="button"
            variant="outline"
            onClick={handleAdd}
            className="!px-2 !py-1 text-xs"
          >
            Add split
          </Button>
        </div>
      </div>
    </div>
  );
}
