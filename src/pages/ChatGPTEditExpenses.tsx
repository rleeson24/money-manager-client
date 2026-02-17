import debounce from "lodash/debounce";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/chatGPTUIComponents";
import { getExpenses, updateExpense, bulkUpdateExpenses, bulkDeleteExpenses, UpdateConflictError } from "../services/expenseService";
import Swal from "sweetalert2";
import type { Expense } from "../types/expense";
import { getPaymentMethods, type PaymentMethod } from "../services/paymentMethodService";
import { getCategories, type Category } from "../services/categoryService";
import "./ChatGPTEditExpenses.css";

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
  category?: string;
  datePaid?: string | null;
  setDatePaidToNull?: boolean;
}

export default function ExpensesEditor() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [month, setMonth] = useState("2026-01");
  const [dirtyCells, setDirtyCells] = useState<CellState>({});
  const [errorCells, setErrorCells] = useState<CellState>({});
  const [selectedExpenses, setSelectedExpenses] = useState<Set<number>>(
    new Set()
  );
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
  const [bulkUpdateForm, setBulkUpdateForm] = useState<BulkUpdateForm>({});
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const undoStack = useRef<Expense[][]>([]);
  const patchDebounceRef = useRef<
    Record<
      string,
      ((id: number, field: string, value: string | number | null | undefined, exp: Expense) => void) & {
        cancel(): void;
      }
    >
  >({});
  const nextTempIdRef = useRef(-1);

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Draft row for "add new" - not in database until user fills and blurs
  const [draftNewRow, setDraftNewRow] = useState<{
    date: string;
    description: string;
    amount: number;
    paymentMethod?: number | null;
    category?: string | null;
    datePaid: string;
  }>({
    date: "",
    description: "",
    amount: 0,
    paymentMethod: undefined,
    category: undefined,
    datePaid: "",
  });

  // Debounce search term by 1 second (lodash debounce)
  const setDebouncedSearchTermDebounced = useMemo(
    () => debounce((value: string) => setDebouncedSearchTerm(value), 1000),
    []
  );
  useEffect(() => {
    setDebouncedSearchTermDebounced(searchTerm);
    return () => setDebouncedSearchTermDebounced.cancel();
  }, [searchTerm, setDebouncedSearchTermDebounced]);

  useEffect(() => {
    let cancelled = false;
    const search = debouncedSearchTerm.trim() || undefined;
    Promise.all([
      getExpenses({ month, search }),
      getCategories(),
      getPaymentMethods(),
    ]).then(([expensesData, categoriesData, paymentMethodsData]) => {
      if (cancelled) return;
      setExpenses(expensesData);
      setCategories(categoriesData);
      setPaymentMethods(paymentMethodsData);
    });
    return () => {
      cancelled = true;
    };
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

  // Normalize amount input: move '-' to beginning if present at end
  function normalizeAmountInput(value: string): string {
    if (!value) return value;
    
    // Check if value ends with '-' or starts with '-'
    const endsWithDash = value.endsWith('-');
    const startsWithDash = value.startsWith('-');
    
    // Remove all '-' signs
    const cleaned = value.replace(/-/g, '');
    
    // If there was a '-' (at beginning or end), add it to the beginning
    if (endsWithDash || startsWithDash) {
      return cleaned ? `-${cleaned}` : '-';
    }
    
    return cleaned;
  }

  function optimisticUpdate(expense: Expense, field: string, value: string | number | null | undefined) {
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
      patchValue: string | number | null | undefined,
      exp: Expense
    ) => void) & { cancel(): void };
    const key = `${id}-${field}`;
    if (!patchDebounceRef.current[key]) {
      patchDebounceRef.current[key] = debounce(
        (patchId: number, patchField: string, patchValue: string | number | null | undefined, exp: Expense) => {
          const payload: Partial<Expense> = {
            [patchField]: patchValue === undefined || patchValue === null ? undefined : patchValue,
            modifiedDateTime: exp.modifiedDateTime,
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
      const aVal: string | number | undefined | null = a[sortColumn as keyof Expense];
      const bVal: string | number | undefined | null = b[sortColumn as keyof Expense];

      if (sortColumn === "date" || sortColumn === "datePaid") {
        const aDate = aVal ? new Date(aVal as string).getTime() : 0;
        const bDate = bVal ? new Date(bVal as string).getTime() : 0;
        if (aDate < bDate) return sortDirection === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDirection === "asc" ? 1 : -1;
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

    if (bulkUpdateForm.category !== undefined && bulkUpdateForm.category !== "") {
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
    return (
      (draftNewRow.description?.trim() ?? "") !== "" ||
      (draftNewRow.amount !== 0 && !Number.isNaN(draftNewRow.amount)) ||
      (draftNewRow.date?.trim() ?? "") !== ""
    );
  }

  function commitDraftRow() {
    if (!hasDraftContent()) return;
    const tempId = nextTempIdRef.current--;
    const newExpense: Expense = {
      id: tempId,
      date: draftNewRow.date || `${month}-01T00:00:00`,
      description: draftNewRow.description?.trim() ?? "",
      amount: draftNewRow.amount ?? 0,
      paymentMethod: draftNewRow.paymentMethod ?? null,
      category: draftNewRow.category?.trim() || null,
      datePaid: draftNewRow.datePaid || null,
    };
    setExpenses((prev) => [...prev, newExpense]);
    setDraftNewRow({
      date: "",
      description: "",
      amount: 0,
      paymentMethod: undefined,
      category: undefined,
      datePaid: "",
    });
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
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition whitespace-nowrap"
            >
              ← Back to Home
            </button>
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

        <table className="expenses-table w-full text-sm">
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
                onClick={() => handleSort("paymentMethod")}
              >
                Method {getSortIcon("paymentMethod")}
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("category")}
              >
                Category {getSortIcon("category")}
              </th>
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
              <tr key={id} className="border-b">
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
                  <div className="flex items-center">
                    <Input
                      data-cell={`${r}-0`}
                      type="date"
                      value={exp.date?.substring(0, 10) || ""}
                      onChange={(e) =>
                        optimisticUpdate(exp, "date", e.target.value)
                      }
                    />
                    {cellBadge(id, "date")}
                  </div>
                </td>
                <td>
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
                </td>
                <td className="w-28 text-right">
                  <div className="flex items-center justify-end">
                    <Input
                      data-cell={`${r}-2`}
                      type="text"
                      step="0.01"
                      value={
                        exp.amount !== undefined && exp.amount !== null
                          ? Number(exp.amount).toFixed(2)
                          : ""
                      }
                      onChange={(e) => {
                        const normalized = normalizeAmountInput(e.target.value);
                        const numValue = parseFloat(normalized) || 0;
                        optimisticUpdate(exp, "amount", numValue);
                      }}
                      className={
                        exp.amount < 0
                          ? "text-blue-600 text-right"
                          : "text-right"
                      }
                    />
                    {cellBadge(id, "amount")}
                  </div>
                </td>
                <td>
                  <Select
                    value={exp.paymentMethod != null ? String(exp.paymentMethod) : ""}
                    onValueChange={(v) =>
                      optimisticUpdate(
                        exp,
                        "paymentMethod",
                        v === "" ? undefined : Number(v)
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— None —</SelectItem>
                      {paymentMethods.map((pm) => (
                        <SelectItem key={pm.ID} value={String(pm.ID)}>
                          {pm.PaymentMethod}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {cellBadge(id, "paymentMethod")}
                </td>
                <td>
                  <Select
                    value={exp.category ?? ""}
                    onValueChange={(v) =>
                      optimisticUpdate(
                        exp,
                        "category",
                        v === "" ? undefined : v
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— None —</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.Category_I} value={c.Name}>
                          {c.Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {cellBadge(id, "category")}
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
            ); })}
            {/* New row placeholder - not in database until Add is clicked */}
            <tr className="border-b border-dashed bg-gray-50/70" aria-label="New expense row">
              <td className="align-middle">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!hasDraftContent()}
                  onClick={commitDraftRow}
                  className="!px-2 !py-1 text-xs"
                >
                  Add
                </Button>
              </td>
              <td className="w-32">
                <Input
                  type="date"
                  placeholder="Date"
                  value={draftNewRow.date}
                  onChange={(e) => updateDraft("date", e.target.value)}
                  className="bg-white/80 placeholder:italic"
                />
              </td>
              <td>
                <Input
                  placeholder="Add new expense..."
                  value={draftNewRow.description}
                  onChange={(e) => updateDraft("description", e.target.value)}
                  className="bg-white/80 placeholder:italic placeholder:text-gray-400"
                />
              </td>
              <td className="w-28 text-right">
                <Input
                  type="text"
                  value={
                    draftNewRow.amount !== 0 && !Number.isNaN(draftNewRow.amount)
                      ? Number(draftNewRow.amount).toFixed(2)
                      : ""
                  }
                  onChange={(e) => {
                    const normalized = normalizeAmountInput(e.target.value);
                    updateDraft("amount", parseFloat(normalized) || 0);
                  }}
                  placeholder="0.00"
                  className="text-right bg-white/80 placeholder:italic placeholder:text-gray-400"
                />
              </td>
              <td>
                <Select
                  value={draftNewRow.paymentMethod != null ? String(draftNewRow.paymentMethod) : ""}
                  onValueChange={(v) =>
                    updateDraft("paymentMethod", v === "" ? undefined : Number(v))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.ID} value={String(pm.ID)}>
                        {pm.PaymentMethod}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td>
                <Select
                  value={draftNewRow.category ?? ""}
                  onValueChange={(v) => updateDraft("category", v === "" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.Category_I} value={c.Name}>
                        {c.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="w-32">
                <Input
                  type="date"
                  value={draftNewRow.datePaid}
                  onChange={(e) => updateDraft("datePaid", e.target.value)}
                  className="bg-white/80 placeholder:italic"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <p className="text-xs text-muted-foreground mt-2">
          ⚠ Unsaved · ❌ Error · Ctrl+Z Undo · Bottom row: new expense (click Add to save)
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
              <Select
                value={bulkUpdateForm.category || ""}
                onValueChange={(v) =>
                  setBulkUpdateForm({
                    ...bulkUpdateForm,
                    category: v || undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- Keep Current --</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.Category_I} value={c.Name}>
                      {c.Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
