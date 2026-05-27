import debounce from "lodash/debounce";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactSelect, { SingleValue } from "react-select";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Input,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/chatGPTUIComponents";
import { getExpenses, 
  updateExpense,
  bulkUpdateExpenses,
  bulkDeleteExpenses,
  UpdateConflictError,
  createExpense } from "../services/expenseService";
import { ExpenseSplitReadonlyGrid } from "../components/ExpenseSplitReadonlyGrid";
import { ExpenseSplitDialog } from "../components/ExpenseSplitDialog";
import type { ExpenseSplit } from "../types/expenseSplit";
import Swal from "sweetalert2";
import type { Expense } from "../types/expense";
import { getPaymentMethods, type PaymentMethod } from "../services/paymentMethodService";
import { getCategories, type Category } from "../services/categoryService";
import {
  buildGroupedCategoryOptions,
  flattenCategoryOptionLabels,
  getCategoryLabel,
  resolveCategorySelectValue,
} from "../utils/categoryOptions";
import { isAbortError } from "../config/api";
import { sanitizeAmountInput, formatAmountForBlur } from "../utils/amountInput";
import {
  localDateInputToUtc,
  todayUtcExpenseDate,
  utcToLocalDateInput,
} from "../utils/expenseDate";
import "./EditExpenses.css";

/*
 FINAL ENHANCEMENTS:
 - Inline validation badges (⚠ unsaved / ❌ error)
 - Undo (Ctrl+Z)
 - Spreadsheet navigation
 - Optimistic UI + rollback
*/

interface CellState {
  [key: string]: boolean;
}

type SortDirection = "asc" | "desc" | null;
type SortColumn =
  | "date"
  | "description"
  | "amount"
  | "paymentMethod"
  | "category"
  | "datePaid"
  | null;

interface BulkUpdateForm {
  date?: string;
  category?: number;
  datePaid?: string | null;
  setDatePaidToNull?: boolean;
}

type DraftFocusField =
  | "date"
  | "description"
  | "amount"
  | "paymentMethod"
  | "category";

function snapshotActiveDraftFocusField(
  draftRowEl: HTMLTableRowElement | null
): DraftFocusField {
  const active = document.activeElement;
  if (
    !active ||
    !(active instanceof HTMLElement) ||
    !draftRowEl ||
    !draftRowEl.contains(active)
  ) {
    return "description";
  }
  const scoped = active.closest("[data-draft-focus]");
  if (!scoped || !draftRowEl.contains(scoped)) return "description";
  const raw = scoped.getAttribute("data-draft-focus");
  if (
    raw === "date" ||
    raw === "description" ||
    raw === "amount" ||
    raw === "paymentMethod" ||
    raw === "category"
  ) {
    return raw;
  }
  return "description";
}

function focusWithinFieldHost(host: Element | null, field: DraftFocusField): void {
  if (!host) return;

  if (field === "paymentMethod" || field === "category") {
    const input = host.querySelector<HTMLInputElement>("input:not([type=hidden])");
    input?.focus();
    return;
  }

  const inputEl = host.querySelector<HTMLElement>(
    "input:not([disabled]):not([type=hidden]), textarea:not([disabled])"
  );
  if (!inputEl) return;
  inputEl.focus();
  if (field === "date" && inputEl instanceof HTMLInputElement) {
    inputEl.select?.();
  }
}

function focusExpenseRowField(expenseRowEl: HTMLTableRowElement | null, field: DraftFocusField): void {
  if (!expenseRowEl) return;
  focusWithinFieldHost(
    expenseRowEl.querySelector(`[data-expense-focus="${field}"]`),
    field
  );
}

export default function EditExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [month, setMonth] = useState("2026-" + (new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [dirtyCells, setDirtyCells] = useState<CellState>({});
  const [errorCells, setErrorCells] = useState<CellState>({});
  const [selectedExpenses, setSelectedExpenses] = useState<Set<number>>(
    new Set()
  );
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
  const [bulkUpdateForm, setBulkUpdateForm] = useState<BulkUpdateForm>({});
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [expandedSplits, setExpandedSplits] = useState<Set<number>>(new Set());
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitDialogExpense, setSplitDialogExpense] = useState<Expense | null>(null);
  const [splitDialogInitialSplits, setSplitDialogInitialSplits] = useState<ExpenseSplit[]>([]);
  const [splitRefreshKey, setSplitRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [editingAmount, setEditingAmount] = useState<Record<number, string>>({});
  const [focusedAmountId, setFocusedAmountId] = useState<number | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const undoStack = useRef<Expense[][]>([]);
  const hadDraftContent = useRef(false);
  const pendingPostSaveFocusRef = useRef<{
    expenseId: number | null;
    field: DraftFocusField;
  } | null>(null);
  const draftRowRef = useRef<HTMLTableRowElement | null>(null);
  const expensesTableRef = useRef<HTMLTableElement | null>(null);
  const patchDebounceRef = useRef<
    Record<
      string,
      ((id: number, field: string, value: string | number | boolean | null | undefined, exp: Expense) => void) & {
        cancel(): void;
      }
    >
  >({});
  const expensesRef = useRef<Expense[]>([]);

  useEffect(() => {
    expensesRef.current = expenses;
  }, [expenses]);

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const paymentMethodOptions = useMemo(
    () =>
      [
        { value: "", label: "— None —" },
        ...paymentMethods.map((pm) => ({
          value: String(pm.id),
          label: pm.PaymentMethod,
        })),
      ],
    [paymentMethods]
  );

  const categoryOptions = useMemo(
    () => buildGroupedCategoryOptions(categories, { includeNone: true, activeOnly: true }),
    [categories]
  );

  // Width for Method/Category selects: fit longest option (approx 8px per char + padding)
  const paymentMethodSelectWidth = useMemo(() => {
    if (paymentMethodOptions.length === 0) return 100;
    const maxLen = Math.max(...paymentMethodOptions.map((o) => o.label.length));
    return Math.min(360, 40 + maxLen * 10);
  }, [paymentMethodOptions]);
  const categorySelectWidth = useMemo(() => {
    const labels = flattenCategoryOptionLabels(categoryOptions);
    if (labels.length === 0) return 100;
    const maxLen = Math.max(...labels.map((l) => l.length));
    return Math.min(320, 24 + maxLen * 8);
  }, [categoryOptions]);

  // Draft row for "add new" - not in database until user fills and blurs
  const today = () => todayUtcExpenseDate();
  const [draftNewRow, setDraftNewRow] = useState<{
    date: string;
    description: string;
    amount: string;
    paymentMethod?: number | null;
    category?: number | null;
  }>(() => ({
    date: today(),
    description: "",
    amount: "",
    paymentMethod: undefined,
    category: undefined,
  }));

  // Debounce search term by 1 second (lodash debounce)
  const setDebouncedSearchTermDebounced = useMemo(
    () => debounce((value: string) => setDebouncedSearchTerm(value), 1000),
    []
  );
  useEffect(() => {
    setDebouncedSearchTermDebounced(searchTerm);
    return () => setDebouncedSearchTermDebounced.cancel();
  }, [searchTerm, setDebouncedSearchTermDebounced]);

  /** After draft save completes, focus the same logical field on the row that was just saved. */
  useEffect(() => {
    if (isSavingDraft) return;
    const pending = pendingPostSaveFocusRef.current;
    pendingPostSaveFocusRef.current = null;
    if (pending == null || pending.expenseId == null) return;
    const row = expensesTableRef.current?.querySelector<HTMLTableRowElement>(
      `tr[data-expense-id="${pending.expenseId}"]`
    );
    if (!row) return;
    const { field } = pending;
    const t = window.setTimeout(() => {
      row.scrollIntoView({ block: "nearest", inline: "nearest" });
      focusExpenseRowField(row, field);
    }, 0);
    return () => clearTimeout(t);
  }, [isSavingDraft]);

  useEffect(() => {
    const ac = new AbortController();
    const search = debouncedSearchTerm.trim() || undefined;
    Promise.all([
      getExpenses({ month, search, signal: ac.signal }),
      getCategories(ac.signal),
      getPaymentMethods(ac.signal),
    ])
      .then(([expensesData, categoriesData, paymentMethodsData]) => {
        if (ac.signal.aborted) return;
        setExpenses(expensesData);
        setCategories(categoriesData);
        setPaymentMethods(paymentMethodsData);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted || isAbortError(err)) return;
        console.error("Failed to load expenses page data:", err);
      });
    return () => ac.abort();
  }, [month, debouncedSearchTerm]);

  useEffect(() => {
    function handleUndo(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "z" && undoStack.current.length) {
        const prev = undoStack.current.pop();
        if (prev) {
          setExpenses(prev);
        }
      }
    }
    window.addEventListener("keydown", handleUndo);
    return () => window.removeEventListener("keydown", handleUndo);
  }, []);

  function clearAmountEditing(id: number) {
    setEditingAmount((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFocusedAmountId((prev) => (prev === id ? null : prev));
  }

  function cancelPendingPatchesForExpense(id: number) {
    Object.entries(patchDebounceRef.current).forEach(([key, debouncedFn]) => {
      if (key.startsWith(`${id}-`)) debouncedFn.cancel();
    });
  }

  function markPatchFields(id: number, fields: string[], dirty: boolean, errored = false) {
    setDirtyCells((d) => {
      const next = { ...d };
      fields.forEach((field) => {
        next[`${id}-${field}`] = dirty;
      });
      return next;
    });
    setErrorCells((e) => {
      const next = { ...e };
      fields.forEach((field) => {
        next[`${id}-${field}`] = errored;
      });
      return next;
    });
  }

  function saveExpensePatch(
    expense: Expense,
    fields: Partial<Expense>,
    expectedModifiedDateTime?: string
  ): Promise<Expense> {
    const id = expIdNum(expense);
    const fieldNames = Object.keys(fields);
    const payload: Partial<Expense> = {
      ...fields,
      modifiedDateTime: expectedModifiedDateTime ?? expense.modifiedDateTime,
    };

    return updateExpense(id, payload)
      .then((updated) => {
        setExpenses((prev) => prev.map((x) => (expIdNum(x) !== id ? x : updated)));
        markPatchFields(id, fieldNames, false);
        return updated;
      })
      .catch((err) => {
        if (err instanceof UpdateConflictError) {
          return Swal.fire({
            title: "Conflict",
            text: "This expense has been updated already. Do you want to overwrite?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes",
            cancelButtonText: "No",
          }).then((result) => {
            if (result.isConfirmed) {
              return saveExpensePatch(expense, fields, err.currentExpense.modifiedDateTime);
            }
            setExpenses((prev) => prev.map((x) => (expIdNum(x) !== id ? x : err.currentExpense)));
            markPatchFields(id, fieldNames, false);
            throw err;
          });
        }
        markPatchFields(id, fieldNames, true, true);
        throw err;
      });
  }

  /** Immediate multi-field save (e.g. split checkbox sets isSplit + category together). */
  function applyExpensePatch(expense: Expense, fields: Partial<Expense>) {
    const id = expIdNum(expense);
    const fieldNames = Object.keys(fields);
    cancelPendingPatchesForExpense(id);
    undoStack.current.push([...expensesRef.current]);
    markPatchFields(id, fieldNames, true);
    setExpenses((prev) =>
      prev.map((x) => (expIdNum(x) === id ? { ...x, ...fields } : x))
    );
    return saveExpensePatch(expense, fields);
  }

  function optimisticUpdate(expense: Expense, field: string, value: string | number | boolean | null | undefined) {
    const id = expIdNum(expense);
    undoStack.current.push([...expenses]);

    setDirtyCells((d) => ({ ...d, [`${id}-${field}`]: true }));
    setErrorCells((e) => ({ ...e, [`${id}-${field}`]: false }));

    setExpenses((prev) =>
      prev.map((x) => (expIdNum(x) === id ? { ...x, [field]: value } : x))
    );

    type PatchFn = ((
      patchId: number,
      patchField: string,
      patchValue: string | number | boolean | null | undefined,
      exp: Expense
    ) => void) & { cancel(): void };
    const key = `${id}-${field}`;
    if (!patchDebounceRef.current[key]) {
      patchDebounceRef.current[key] = debounce(
        (patchId: number, patchField: string, patchValue: string | number | boolean | null | undefined, exp: Expense) => {
          const current = expensesRef.current.find((x) => expIdNum(x) === patchId);
          const payload: Partial<Expense> = {
            [patchField]: patchValue === undefined || patchValue === null ? undefined : patchValue,
            modifiedDateTime: current?.modifiedDateTime ?? exp.modifiedDateTime,
          };
          updateExpense(patchId, payload)
            .then((updated) => {
              setExpenses((prev) => prev.map((x) => (expIdNum(x) !== patchId ? x : updated)));
              setDirtyCells((d) => ({ ...d, [`${patchId}-${patchField}`]: false }));
              setErrorCells((e) => ({ ...e, [`${patchId}-${patchField}`]: false }));
            })
            .catch((err) => {
              if (err instanceof UpdateConflictError) {
                Swal.fire({
                  title: "Conflict",
                  text: "This expense has been updated already. Do you want to overwrite?",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: "Yes",
                  cancelButtonText: "No",
                }).then((result) => {
                  if (result.isConfirmed) {
                    updateExpense(patchId, {
                      [patchField]: patchValue === undefined || patchValue === null ? undefined : patchValue,
                      modifiedDateTime: err.currentExpense.modifiedDateTime,
                    })
                      .then((updated) => {
                        setExpenses((prev) => prev.map((x) => (expIdNum(x) !== patchId ? x : updated)));
                        setDirtyCells((d) => ({ ...d, [`${patchId}-${patchField}`]: false }));
                        setErrorCells((e) => ({ ...e, [`${patchId}-${patchField}`]: false }));
                      })
                      .catch(() => setErrorCells((e) => ({ ...e, [`${patchId}-${patchField}`]: true })));
                  } else {
                    setExpenses((prev) => prev.map((x) => (expIdNum(x) !== patchId ? x : err.currentExpense)));
                    setDirtyCells((d) => ({ ...d, [`${patchId}-${patchField}`]: false }));
                    setErrorCells((e) => ({ ...e, [`${patchId}-${patchField}`]: false }));
                  }
                });
              } else {
                setErrorCells((e) => ({ ...e, [`${patchId}-${patchField}`]: true }));
              }
            });
        },
        1000
      ) as PatchFn;
    }
    patchDebounceRef.current[key](id, field, value, expense);
  }

  function expIdNum(exp: Expense): number {
    return typeof exp.id === "number" ? exp.id : parseInt(String(exp.id), 10);
  }

  /** Revert isSplit (and category) for an expense when user cancels the split dialog; uses undo stack. */
  function revertIsSplitForExpense(expenseId: number) {
    const stack = undoStack.current;
    if (stack.length >= 2) {
      stack.pop();
      const prev = stack.pop();
      if (prev) {
        const prevExp = prev.find((e) => expIdNum(e) === expenseId);
        if (prevExp != null)
          setExpenses((current) =>
            current.map((e) =>
              expIdNum(e) === expenseId
                ? { ...e, isSplit: prevExp.isSplit, category: prevExp.category }
                : e
            )
          );
      }
    } else if (stack.length === 1) {
      const prev = stack.pop();
      if (prev) {
        const prevExp = prev.find((e) => expIdNum(e) === expenseId);
        if (prevExp != null)
          setExpenses((current) =>
            current.map((e) =>
              expIdNum(e) === expenseId
                ? { ...e, isSplit: prevExp.isSplit, category: prevExp.category }
                : e
            )
          );
      }
    }
  }

  function cellBadge(id: number, field: string) {
    if (errorCells[`${id}-${field}`])
      return <span className="text-red-600 ml-1">❌</span>;
    if (dirtyCells[`${id}-${field}`])
      return <span className="text-yellow-600 ml-1">⚠</span>;
    return null;
  }

  // Sorting functionality
  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function getSortedExpenses(): Expense[] {
    if (!sortColumn || !sortDirection) {
      return expenses;
    }

    const sorted = [...expenses].sort((a, b) => {
      const aVal: string | number | boolean | undefined | null = a[sortColumn as keyof Expense];
      const bVal: string | number | boolean | undefined | null = b[sortColumn as keyof Expense];

      if (sortColumn === "date" || sortColumn === "datePaid") {
        const aDate = aVal ? new Date(aVal as string).getTime() : 0;
        const bDate = bVal ? new Date(bVal as string).getTime() : 0;
        if (aDate < bDate) return sortDirection === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortColumn === "category") {
        const aName = getCategoryLabel(a.category, categories);
        const bName = getCategoryLabel(b.category, categories);
        const aStr = aName.toLowerCase();
        const bStr = bName.toLowerCase();
        if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
        if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortColumn === "amount" || sortColumn === "paymentMethod") {
        const aNum = (aVal as number) ?? 0;
        const bNum = (bVal as number) ?? 0;
        if (aNum < bNum) return sortDirection === "asc" ? -1 : 1;
        if (aNum > bNum) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      const aStr = (aVal as string)?.toLowerCase() ?? "";
      const bStr = (bVal as string)?.toLowerCase() ?? "";
      if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
      if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  function getSortIcon(column: SortColumn): string {
    if (sortColumn !== column) return "⇅";
    if (sortDirection === "asc") return "↑";
    if (sortDirection === "desc") return "↓";
    return "⇅";
  }

  // Checkbox functionality
  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelectedExpenses(new Set(expenses.map((exp) => expIdNum(exp))));
    } else {
      setSelectedExpenses(new Set());
    }
  }

  function handleSelectExpense(expenseId: number, checked: boolean) {
    const newSelected = new Set(selectedExpenses);
    if (checked) {
      newSelected.add(expenseId);
    } else {
      newSelected.delete(expenseId);
    }
    setSelectedExpenses(newSelected);
  }

  // Bulk update functionality
  function handleBulkUpdate() {
    if (selectedExpenses.size === 0) {
      setError("Please select at least one expense to update.");
      return;
    }

    setBulkUpdateDialogOpen(true);
    setBulkUpdateForm({});
  }

  async function handleBulkUpdateSubmit() {
    const updates: Partial<Expense> = {};

    if (bulkUpdateForm.date !== undefined && bulkUpdateForm.date !== "") {
      updates.date = bulkUpdateForm.date + "T00:00:00";
    }

    if (bulkUpdateForm.category !== undefined) {
      updates.category = bulkUpdateForm.category;
    }

    if (bulkUpdateForm.setDatePaidToNull) {
      updates.datePaid = undefined;
    } else if (bulkUpdateForm.datePaid !== undefined && bulkUpdateForm.datePaid !== "") {
      updates.datePaid = bulkUpdateForm.datePaid + "T00:00:00";
    }

    setExpenses((prev) =>
      prev.map((exp) =>
        selectedExpenses.has(expIdNum(exp)) ? { ...exp, ...updates } : exp
      )
    );

    selectedExpenses.forEach((id) => {
      if (updates.date) setDirtyCells((d) => ({ ...d, [`${id}-date`]: true }));
      if (updates.category) setDirtyCells((d) => ({ ...d, [`${id}-category`]: true }));
      if (updates.datePaid !== undefined) setDirtyCells((d) => ({ ...d, [`${id}-datePaid`]: true }));
    });

    try {
      await bulkUpdateExpenses(Array.from(selectedExpenses), updates);
      selectedExpenses.forEach((id) => {
        if (updates.date) setDirtyCells((d) => ({ ...d, [`${id}-date`]: false }));
        if (updates.category) setDirtyCells((d) => ({ ...d, [`${id}-category`]: false }));
        if (updates.datePaid !== undefined) setDirtyCells((d) => ({ ...d, [`${id}-datePaid`]: false }));
      });
    } catch (err) {
      console.error("Error bulk updating expenses:", err);
      setError("Failed to bulk update expenses");
    }

    setBulkUpdateDialogOpen(false);
    setBulkUpdateForm({});
    setSelectedExpenses(new Set());
  }

  // Bulk delete functionality
  function handleBulkDelete() {
    if (selectedExpenses.size === 0) {
      setError("Please select at least one expense to delete.");
      return;
    }
    setBulkDeleteDialogOpen(true);
  }

  async function handleBulkDeleteConfirm() {
    setExpenses((prev) =>
      prev.filter((exp) => !selectedExpenses.has(expIdNum(exp)))
    );

    try {
      await bulkDeleteExpenses(Array.from(selectedExpenses));
    } catch (err) {
      console.error("Error bulk deleting expenses:", err);
      setError("Failed to bulk delete expenses");
      // Reload expenses to restore the list
      const expensesData = await getExpenses({ month });
      setExpenses(expensesData);
    }

    setBulkDeleteDialogOpen(false);
    setSelectedExpenses(new Set());
  }

  // Calculate sum of selected expenses
  function getSelectedSum(): number {
    return expenses
      .filter((exp) => selectedExpenses.has(expIdNum(exp)))
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }

  function hasDraftContent(): boolean {
    const amountTrimmed = draftNewRow.amount?.trim() ?? "";
    const amountValid =
      amountTrimmed !== "" && !Number.isNaN(parseFloat(draftNewRow.amount));
    return (
      ((draftNewRow.description?.trim() ?? "") !== "" ||
      amountValid) &&
      (draftNewRow.date?.trim() ?? "") !== ""
    );
  }

  useEffect(() => {
    if (isSavingDraft) return;
    if(!hasDraftContent()) {
      hadDraftContent.current = false;
      return;
    }
    if(!hadDraftContent.current) {
      hadDraftContent.current = true;
      commitDraftRow();
    }
  }, [isSavingDraft, draftNewRow]);

  async function commitDraftRow() {
    if (!hasDraftContent()) return;
    pendingPostSaveFocusRef.current = {
      expenseId: null,
      field: snapshotActiveDraftFocusField(draftRowRef.current),
    };
    setIsSavingDraft(true);
    const amountNum = parseFloat(draftNewRow.amount) || 0;
    try {
      const payload = {
        date: draftNewRow.date || localDateInputToUtc(`${month}-01`),
        description: draftNewRow.description?.trim() ?? "",
        amount: amountNum,
        paymentMethod: draftNewRow.paymentMethod ?? null,
        category: draftNewRow.category ?? null,
      };
      const savedExpense = await createExpense(payload);
      if (pendingPostSaveFocusRef.current) {
        pendingPostSaveFocusRef.current.expenseId = expIdNum(savedExpense);
      }
      setExpenses((prev) => [...prev, savedExpense]);
      setDraftNewRow({
        date: today(),
        description: "",
        amount: "",
        paymentMethod: undefined,
        category: undefined,
      });
      hadDraftContent.current = false;
    } catch (error) {
      pendingPostSaveFocusRef.current = null;
      console.error("Error creating expense:", error);
      setError("Failed to create expense");
    } finally {
      setIsSavingDraft(false);
    }
  }

  function updateDraft(
    field: keyof typeof draftNewRow,
    value: string | number | null | undefined
  ) {
    setDraftNewRow((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="w-full min-w-0">
      <header className="w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 px-4 py-4 md:px-6">
          <h1 className="text-xl font-semibold text-gray-900 m-0 whitespace-nowrap">
            Edit Expenses - USD
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-40"
            />
            <Button
              onClick={() => navigate("/")}
              variant="primary"
              className="!bg-gray-600 hover:!bg-gray-700 whitespace-nowrap"
            >
              ← Back to Home
            </Button>
          </div>
        </div>
      </header>

      <Card className="m-4">
        <CardContent className="overflow-auto">
          {error && <div className="error-message mb-4">{error}</div>}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            type="search"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-w-[200px] max-w-xs"
          />
          <Button
            onClick={handleBulkUpdate}
            disabled={selectedExpenses.size === 0}
            variant="primary"
          >
            Bulk Updates ({selectedExpenses.size})
          </Button>
          <Button
            onClick={handleBulkDelete}
            disabled={selectedExpenses.size === 0}
            variant="ghost"
          >
            Delete ({selectedExpenses.size})
          </Button>
          {selectedExpenses.size > 0 && (
            <div className="flex items-center gap-3 ml-2">
              <span className="text-sm text-gray-600">
                {selectedExpenses.size} expense
                {selectedExpenses.size !== 1 ? "s" : ""} selected
              </span>
              <span className="text-sm font-semibold text-blue-600">
                Total: ${getSelectedSum().toFixed(2)}
              </span>
            </div>
          )}
          {debouncedSearchTerm && (
            <span className="text-xs text-gray-500">
              (search: &quot;{debouncedSearchTerm}&quot;)
            </span>
          )}
        </div>

        <table ref={expensesTableRef} className="expenses-table w-full text-sm">
          <thead className="sticky top-0 bg-background border-b">
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selectedExpenses.size === expenses.length &&
                    expenses.length > 0
                  }
                  onChange={handleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100 select-none w-32"
                onClick={() => handleSort("date")}
              >
                Date {getSortIcon("date")}
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("description")}
              >
                Expense {getSortIcon("description")}
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100 select-none w-28 text-right"
                onClick={() => handleSort("amount")}
              >
                Amount {getSortIcon("amount")}
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100 select-none"
                style={{ width: paymentMethodSelectWidth + 10, minWidth: paymentMethodSelectWidth + 10 }}
                onClick={() => handleSort("paymentMethod")}
              >
                Method {getSortIcon("paymentMethod")}
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100 select-none"
                style={{ width: categorySelectWidth + 10, minWidth: categorySelectWidth + 10 }}
                onClick={() => handleSort("category")}
              >
                Category {getSortIcon("category")}
              </th>
              <th className="w-12 text-center" style={{ width: 48 }}>Split</th>
              <th className="w-8 px-1" aria-label="Expand splits" />
              <th
                className="cursor-pointer hover:bg-gray-100 select-none w-32"
                onClick={() => handleSort("datePaid")}
              >
                Date Paid {getSortIcon("datePaid")}
              </th>
            </tr>
          </thead>
          <tbody>
            {getSortedExpenses().map((exp, r) => {
              const id = expIdNum(exp);
              return (
              <React.Fragment key={id}>
              <tr className="border-b" data-expense-id={id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedExpenses.has(id)}
                    onChange={(e) =>
                      handleSelectExpense(id, e.target.checked)
                    }
                    className="cursor-pointer"
                  />
                </td>
                <td className="w-32">
                  <div data-expense-focus="date">
                  <div className="flex items-center">
                    <Input
                      data-cell={`${r}-0`}
                      type="date"
                      value={utcToLocalDateInput(exp.date)}
                      onChange={(e) =>
                        optimisticUpdate(exp, "date", localDateInputToUtc(e.target.value))
                      }
                    />
                    {cellBadge(id, "date")}
                  </div>
                  </div>
                </td>
                <td>
                  <div data-expense-focus="description">
                  <div className="flex items-center">
                    <Input
                      data-cell={`${r}-1`}
                      value={exp.description || ""}
                      onChange={(e) =>
                        optimisticUpdate(exp, "description", e.target.value)
                      }
                    />
                    {cellBadge(id, "description")}
                  </div>
                  </div>
                </td>
                <td className="w-28 text-right">
                  <div data-expense-focus="amount">
                  <div className="flex items-center justify-end">
                    <Input
                      data-cell={`${r}-2`}
                      type="text"
                      step="0.01"
                      value={
                        focusedAmountId === id && editingAmount[id] !== undefined
                          ? editingAmount[id]
                          : exp.amount !== undefined && exp.amount !== null
                            ? Number(exp.amount).toFixed(2)
                            : ""
                      }
                      onFocus={() => {
                        setFocusedAmountId(id);
                        setEditingAmount((prev) => ({
                          ...prev,
                          [id]:
                            exp.amount !== undefined && exp.amount !== null
                              ? Number(exp.amount).toFixed(2)
                              : "",
                        }));
                      }}
                      onChange={(e) => {
                        setEditingAmount((prev) => ({
                          ...prev,
                          [id]: sanitizeAmountInput(e.target.value),
                        }));
                      }}
                      onBlur={() => {
                        const raw =
                          focusedAmountId === id ? editingAmount[id] ?? "" : "";
                        const formatted = formatAmountForBlur(raw);
                        const n = parseFloat(formatted);
                        if (formatted !== "" && !Number.isNaN(n)) {
                          optimisticUpdate(exp, "amount", n);
                        }
                        clearAmountEditing(id);
                      }}
                      className={
                        exp.amount < 0
                          ? "text-blue-600 text-right"
                          : "text-right"
                      }
                    />
                    {cellBadge(id, "amount")}
                  </div>
                  </div>
                </td>
                <td style={{ width: paymentMethodSelectWidth + 10, minWidth: paymentMethodSelectWidth + 10 }}>
                  <div data-expense-focus="paymentMethod">
                  <ReactSelect
                    classNamePrefix="pm-select"
                    isClearable
                    isSearchable
                    options={paymentMethodOptions}
                    value={
                      exp.paymentMethod != null
                        ? paymentMethodOptions.find(
                            (o) => o.value === String(exp.paymentMethod)
                          ) ?? null
                        : paymentMethodOptions.find((o) => o.value === "") ?? null
                    }
                    onChange={(opt: SingleValue<{ value: string; label: string }>) =>
                      optimisticUpdate(
                        exp,
                        "paymentMethod",
                        !opt || opt.value === "" ? undefined : Number(opt.value)
                      )
                    }
                    styles={{
                      container: (base) => ({ ...base, minWidth: paymentMethodSelectWidth, width: paymentMethodSelectWidth }),
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
                  {cellBadge(id, "paymentMethod")}
                  </div>
                </td>
                <td style={{ width: categorySelectWidth + 10, minWidth: categorySelectWidth + 10 }}>
                  <div data-expense-focus="category">
                  <ReactSelect
                    classNamePrefix="cat-select"
                    isClearable
                    isSearchable
                    options={categoryOptions}
                    value={resolveCategorySelectValue(categoryOptions, exp.category)}
                    onChange={(opt: SingleValue<{ value: string; label: string }>) =>
                      optimisticUpdate(
                        exp,
                        "category",
                        !opt || opt.value === "" ? undefined : Number(opt.value)
                      )
                    }
                    isDisabled={exp.isSplit ?? false}
                    styles={{
                      container: (base) => ({ ...base, minWidth: categorySelectWidth, width: categorySelectWidth }),
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
                  {cellBadge(id, "category")}
                  </div>
                </td>
                <td className="text-center" style={{ width: 48 }}>
                  <input
                    type="checkbox"
                    checked={exp.isSplit ?? false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        const splitCategoryId = categories.find((c) => c.name === "Split")?.category_I;
                        const updates: Partial<Expense> = { isSplit: true };
                        if (splitCategoryId != null) updates.category = splitCategoryId;
                        applyExpensePatch(exp, updates)
                          .then((updated) => {
                            setSplitDialogExpense(updated);
                            setSplitDialogInitialSplits([]);
                            setSplitDialogOpen(true);
                          })
                          .catch(() => {});
                      } else {
                        applyExpensePatch(exp, { isSplit: false }).catch(() => {});
                      }
                    }}
                    className="cursor-pointer"
                    aria-label="Split"
                  />
                </td>
                <td className="w-8 px-1 align-middle">
                  {exp.isSplit && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setExpandedSplits((prev) => {
                          const next = new Set(prev);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedSplits((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          });
                        }
                      }}
                      className="text-gray-500 hover:text-gray-800 cursor-pointer select-none inline-block"
                      aria-label={expandedSplits.has(id) ? "Collapse split" : "Expand split"}
                    >
                      {expandedSplits.has(id) ? "▲" : "▼"}
                    </span>
                  )}
                </td>
                <td className="w-32">
                  <div className="flex items-center">
                    <Input
                      data-cell={`${r}-5`}
                      type="date"
                      value={exp.datePaid?.substring(0, 10) || ""}
                      onChange={(e) =>
                        optimisticUpdate(exp, "datePaid", e.target.value)
                      }
                    />
                    {cellBadge(id, "datePaid")}
                  </div>
                </td>
              </tr>
              {expandedSplits.has(id) && (
                <tr>
                  <td colSpan={9} className="p-0 align-top">
                    <ExpenseSplitReadonlyGrid
                      expenseId={id}
                      parentAmount={exp.amount ?? 0}
                      categories={categories}
                      onEditClick={(splits) => {
                        setSplitDialogExpense(exp);
                        setSplitDialogInitialSplits(splits);
                        setSplitDialogOpen(true);
                      }}
                      refreshKey={splitRefreshKey}
                    />
                  </td>
                </tr>
              )}
              </React.Fragment>
            ); })}
            {/* Draft row */}
            <tr
              ref={draftRowRef}
              className="border-b border-dashed bg-gray-50/70"
              aria-label="New expense row"
            >
              <td className="align-middle" />
              <td className="w-32">
                <div data-draft-focus="date">
                <Input
                  type="date"
                  placeholder="Date"
                  value={utcToLocalDateInput(draftNewRow.date)}
                  onChange={(e) => updateDraft("date", localDateInputToUtc(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="bg-white/80 placeholder:italic"
                  disabled={isSavingDraft}
                />
                </div>
              </td>
              <td>
                <div data-draft-focus="description">
                <Input
                  placeholder="Add new expense..."
                  value={draftNewRow.description}
                  onChange={(e) => updateDraft("description", e.target.value)}
                  className="bg-white/80 placeholder:italic placeholder:text-gray-400"
                  disabled={isSavingDraft}
                />
                </div>
              </td>
              <td className="w-28 text-right">
                <div data-draft-focus="amount">
                <Input
                  type="text"
                  value={draftNewRow.amount}
                  onChange={(e) => {
                    updateDraft("amount", sanitizeAmountInput(e.target.value));
                  }}
                  onBlur={() => {
                    updateDraft("amount", formatAmountForBlur(draftNewRow.amount));
                  }}
                  placeholder="0.00"
                  className="text-right bg-white/80 placeholder:italic placeholder:text-gray-400"
                  disabled={isSavingDraft}
                />
                </div>
              </td>
              <td style={{ width: paymentMethodSelectWidth + 10, minWidth: paymentMethodSelectWidth + 10 }}>
                <div data-draft-focus="paymentMethod">
                <ReactSelect
                  classNamePrefix="pm-select"
                  isClearable
                  isSearchable
                  options={paymentMethodOptions}
                  value={
                    draftNewRow.paymentMethod != null
                      ? paymentMethodOptions.find(
                          (o) => o.value === String(draftNewRow.paymentMethod)
                        ) ?? null
                      : paymentMethodOptions.find((o) => o.value === "") ?? null
                  }
                  onChange={(opt: SingleValue<{ value: string; label: string }>) =>
                    updateDraft(
                      "paymentMethod",
                      !opt || opt.value === "" ? undefined : Number(opt.value)
                    )
                  }
                  styles={{
                    container: (base) => ({ ...base, minWidth: paymentMethodSelectWidth, width: paymentMethodSelectWidth }),
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
                  isDisabled={isSavingDraft}
                />
                </div>
              </td>
              <td style={{ width: categorySelectWidth + 10, minWidth: categorySelectWidth + 10 }}>
                <div data-draft-focus="category">
                <ReactSelect
                  classNamePrefix="cat-select"
                  isClearable
                  isSearchable
                  options={categoryOptions}
                  value={resolveCategorySelectValue(categoryOptions, draftNewRow.category)}
                  onChange={(opt: SingleValue<{ value: string; label: string }>) =>
                    updateDraft(
                      "category",
                      !opt || opt.value === "" ? undefined : Number(opt.value)
                    )
                  }
                  styles={{
                    container: (base) => ({ ...base, minWidth: categorySelectWidth, width: categorySelectWidth }),
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
                  isDisabled={isSavingDraft}
                />
                </div>
              </td>
              <td style={{ width: 48 }} />
              <td className="w-8 px-1" />
              <td className="w-32" />
            </tr>
          </tbody>
        </table>

        <p className="text-xs text-muted-foreground mt-2">
          ⚠ Unsaved · ❌ Error · Ctrl+Z Undo · Bottom row: new expense (saves when you enter date, description, or amount)
        </p>
      </CardContent>

      {/* Bulk Update Dialog */}
      <Dialog open={bulkUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Update Expenses</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Update {selectedExpenses.size} selected expense
              {selectedExpenses.size !== 1 ? "s" : ""}. Leave fields empty to
              keep current values.
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <Input
                type="date"
                value={bulkUpdateForm.date || ""}
                onChange={(e) =>
                  setBulkUpdateForm({
                    ...bulkUpdateForm,
                    date: e.target.value,
                  })
                }
                placeholder="Leave empty to keep current"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <ReactSelect
                classNamePrefix="cat-select"
                isClearable
                isSearchable
                options={categoryOptions}
                value={resolveCategorySelectValue(categoryOptions, bulkUpdateForm.category)}
                onChange={(opt: SingleValue<{ value: string; label: string }>) =>
                  setBulkUpdateForm({
                    ...bulkUpdateForm,
                    category:
                      !opt || opt.value === "" ? undefined : Number(opt.value),
                  })
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Date Paid
              </label>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={bulkUpdateForm.datePaid || ""}
                  onChange={(e) =>
                    setBulkUpdateForm({
                      ...bulkUpdateForm,
                      datePaid: e.target.value,
                      setDatePaidToNull: false,
                    })
                  }
                  placeholder="Leave empty to keep current"
                  disabled={bulkUpdateForm.setDatePaidToNull}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bulkUpdateForm.setDatePaidToNull || false}
                    onChange={(e) =>
                      setBulkUpdateForm({
                        ...bulkUpdateForm,
                        setDatePaidToNull: e.target.checked,
                        datePaid: e.target.checked
                          ? undefined
                          : bulkUpdateForm.datePaid,
                      })
                    }
                    className="cursor-pointer"
                  />
                  <span>Set Date Paid to NULL</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setBulkUpdateDialogOpen(false);
                  setBulkUpdateForm({});
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleBulkUpdateSubmit}>
                Apply Updates
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Split expenses edit dialog */}
      {splitDialogExpense && (
        <ExpenseSplitDialog
          open={splitDialogOpen}
          onOpenChange={(open) => {
            setSplitDialogOpen(open);
            if (!open) setSplitDialogExpense(null);
          }}
          expenseId={expIdNum(splitDialogExpense)}
          parentAmount={splitDialogExpense.amount ?? 0}
          initialSplits={splitDialogInitialSplits}
          categories={categories}
          onSaveSuccess={() => setSplitRefreshKey((k) => k + 1)}
          onCancel={() => {
            revertIsSplitForExpense(expIdNum(splitDialogExpense));
            setSplitDialogExpense(null);
          }}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <strong>{selectedExpenses.size}</strong> expense
              {selectedExpenses.size !== 1 ? "s" : ""}? This action cannot be
              undone.
            </p>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => setBulkDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="ghost" onClick={handleBulkDeleteConfirm}>
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}
