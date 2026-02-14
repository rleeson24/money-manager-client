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
import "./ChatGPTEditExpenses.css";

/*
 FINAL ENHANCEMENTS:
 - Inline validation badges (⚠ unsaved / ❌ error)
 - Undo (Ctrl+Z)
 - Spreadsheet navigation
 - Optimistic UI + rollback
*/

// Type definitions
interface Expense {
  Expense_I: number;
  ExpenseDate: string;
  Expense: string;
  Amount: number;
  PaymentMethod?: number | null;
  Category?: string | null;
  DatePaid?: string;
}

interface Category {
  Category_I: number;
  Name: string;
}

interface PaymentMethod {
  ID: number;
  PaymentMethod: string;
}

interface CellState {
  [key: string]: boolean;
}

type SortDirection = "asc" | "desc" | null;
type SortColumn =
  | "ExpenseDate"
  | "Expense"
  | "Amount"
  | "PaymentMethod"
  | "Category"
  | "DatePaid"
  | null;

interface BulkUpdateForm {
  ExpenseDate?: string;
  Category?: string;
  DatePaid?: string | null;
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
      ((id: number, field: string, value: string | number | null | undefined) => void) & {
        cancel(): void;
      }
    >
  >({});
  const nextTempIdRef = useRef(-1);

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Draft row for "add new" - not in database until user fills and blurs
  const [draftNewRow, setDraftNewRow] = useState<{
    ExpenseDate: string;
    Expense: string;
    Amount: number;
    PaymentMethod?: number | null;
    Category?: string | null;
    DatePaid: string;
  }>({
    ExpenseDate: "",
    Expense: "",
    Amount: 0,
    PaymentMethod: undefined,
    Category: undefined,
    DatePaid: "",
  });

  // Debounce search term by 3 seconds (lodash debounce)
  const setDebouncedSearchTermDebounced = useMemo(
    () => debounce((value: string) => setDebouncedSearchTerm(value), 3000),
    []
  );
  useEffect(() => {
    setDebouncedSearchTermDebounced(searchTerm);
    return () => setDebouncedSearchTermDebounced.cancel();
  }, [searchTerm, setDebouncedSearchTermDebounced]);

  useEffect(() => {
    // Mock data for expenses
    const mockExpenses: Expense[] = [
      {
        Expense_I: 1,
        ExpenseDate: "2026-01-05T00:00:00",
        Expense: "Groceries - Whole Foods",
        Amount: 125.5,
        PaymentMethod: 1,
        Category: "Food",
        DatePaid: "2026-01-05T00:00:00",
      },
      {
        Expense_I: 2,
        ExpenseDate: "2026-01-08T00:00:00",
        Expense: "Gas Station",
        Amount: 45.0,
        PaymentMethod: 2,
        Category: "Transportation",
        DatePaid: "2026-01-08T00:00:00",
      },
      {
        Expense_I: 3,
        ExpenseDate: "2026-01-10T00:00:00",
        Expense: "Netflix Subscription",
        Amount: 15.99,
        PaymentMethod: 3,
        Category: "Entertainment",
        DatePaid: "2026-01-10T00:00:00",
      },
      {
        Expense_I: 4,
        ExpenseDate: "2026-01-12T00:00:00",
        Expense: "Electric Bill",
        Amount: 89.25,
        PaymentMethod: 1,
        Category: "Utilities",
        DatePaid: "2026-01-15T00:00:00",
      },
      {
        Expense_I: 5,
        ExpenseDate: "2026-01-15T00:00:00",
        Expense: "Restaurant - Italian",
        Amount: 67.8,
        PaymentMethod: 2,
        Category: "Food",
        DatePaid: "2026-01-15T00:00:00",
      },
      {
        Expense_I: 6,
        ExpenseDate: "2026-01-18T00:00:00",
        Expense: "Pharmacy - Prescription",
        Amount: 32.5,
        PaymentMethod: 1,
        Category: "Healthcare",
        DatePaid: "2026-01-18T00:00:00",
      },
      {
        Expense_I: 7,
        ExpenseDate: "2026-01-20T00:00:00",
        Expense: "Amazon - Office Supplies",
        Amount: 45.99,
        PaymentMethod: 3,
        Category: "Shopping",
        DatePaid: "2026-01-20T00:00:00",
      },
      {
        Expense_I: 8,
        ExpenseDate: "2026-01-22T00:00:00",
        Expense: "Gym Membership",
        Amount: 49.99,
        PaymentMethod: 1,
        Category: "Health & Fitness",
        DatePaid: "2026-01-22T00:00:00",
      },
      {
        Expense_I: 9,
        ExpenseDate: "2026-01-25T00:00:00",
        Expense: "Coffee Shop",
        Amount: 12.5,
        PaymentMethod: 2,
        Category: "Food",
        DatePaid: "2026-01-25T00:00:00",
      },
      {
        Expense_I: 10,
        ExpenseDate: "2026-01-28T00:00:00",
        Expense: "Parking Fee",
        Amount: 8.0,
        PaymentMethod: 2,
        Category: "Transportation",
        DatePaid: "2026-01-28T00:00:00",
      },
    ];

    // Mock data for categories
    const mockCategories: Category[] = [
      { Category_I: 1, Name: "Food" },
      { Category_I: 2, Name: "Transportation" },
      { Category_I: 3, Name: "Entertainment" },
      { Category_I: 4, Name: "Utilities" },
      { Category_I: 5, Name: "Healthcare" },
      { Category_I: 6, Name: "Shopping" },
      { Category_I: 7, Name: "Health & Fitness" },
      { Category_I: 8, Name: "Housing" },
      { Category_I: 9, Name: "Education" },
      { Category_I: 10, Name: "Other" },
    ];

    // Mock data for payment methods
    const mockPaymentMethods: PaymentMethod[] = [
      { ID: 1, PaymentMethod: "Credit Card" },
      { ID: 2, PaymentMethod: "Debit Card" },
      { ID: 3, PaymentMethod: "Cash" },
      { ID: 4, PaymentMethod: "Bank Transfer" },
      { ID: 5, PaymentMethod: "PayPal" },
      { ID: 6, PaymentMethod: "Venmo" },
    ];

    // Filter expenses by month
    let filteredExpenses = mockExpenses.filter((exp) => {
      const expMonth = exp.ExpenseDate.substring(0, 7); // YYYY-MM format
      return expMonth === month;
    });

    // Filter by search term (client-side for mock; API would use query param)
    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.trim().toLowerCase();
      filteredExpenses = filteredExpenses.filter(
        (exp) =>
          (exp.Expense && exp.Expense.toLowerCase().includes(term)) ||
          (exp.Category && exp.Category.toLowerCase().includes(term)) ||
          (exp.Amount !== undefined && exp.Amount.toString().includes(term))
      );
    }

    setExpenses(filteredExpenses);
    setCategories(mockCategories);
    setPaymentMethods(mockPaymentMethods);

    // TODO: Replace with actual API calls when backend is ready
    // const params = new URLSearchParams({ month });
    // if (debouncedSearchTerm.trim()) params.set("search", debouncedSearchTerm.trim());
    // fetch(`/api/expenses?${params}`)
    //   .then((r) => r.json())
    //   .then(setExpenses);
    // fetch("/api/categories")
    //   .then((r) => r.json())
    //   .then(setCategories);
    // fetch("/api/payment-methods")
    //   .then((r) => r.json())
    //   .then(setPaymentMethods);
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

  function optimisticUpdate(id: number, field: string, value: string | number | null | undefined) {
    undoStack.current.push([...expenses]);

    setDirtyCells((d) => ({ ...d, [`${id}-${field}`]: true }));
    setErrorCells((e) => ({ ...e, [`${id}-${field}`]: false }));

    setExpenses((prev) =>
      prev.map((x) => (x.Expense_I === id ? { ...x, [field]: value } : x))
    );

    type PatchFn = ((
      patchId: number,
      patchField: string,
      patchValue: string | number | null | undefined
    ) => void) & { cancel(): void };
    const key = `${id}-${field}`;
    if (!patchDebounceRef.current[key]) {
      patchDebounceRef.current[key] = debounce(
        (patchId: number, patchField: string, patchValue: string | number | null | undefined) => {
          fetch(`/api/expenses/${patchId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [patchField]: patchValue }),
          })
            .then((res) => {
              if (!res.ok) throw new Error();
              setDirtyCells((d) => ({ ...d, [`${patchId}-${patchField}`]: false }));
            })
            .catch(() => {
              setErrorCells((e) => ({ ...e, [`${patchId}-${patchField}`]: true }));
            });
        },
        500
      ) as PatchFn;
    }
    patchDebounceRef.current[key](id, field, value);
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
      const aVal: string | number | undefined | null = a[sortColumn];
      const bVal: string | number | undefined | null = b[sortColumn];

      // Handle date strings
      if (sortColumn === "ExpenseDate" || sortColumn === "DatePaid") {
        const aDate = aVal ? new Date(aVal as string).getTime() : 0;
        const bDate = bVal ? new Date(bVal as string).getTime() : 0;
        if (aDate < bDate) return sortDirection === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      // Handle numbers
      if (sortColumn === "Amount" || sortColumn === "PaymentMethod") {
        const aNum = (aVal as number) ?? 0;
        const bNum = (bVal as number) ?? 0;
        if (aNum < bNum) return sortDirection === "asc" ? -1 : 1;
        if (aNum > bNum) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      // Handle strings
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
      setSelectedExpenses(new Set(expenses.map((exp) => exp.Expense_I)));
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

  function handleBulkUpdateSubmit() {
    const updates: Partial<Expense> = {};

    // Only include fields that were changed
    if (
      bulkUpdateForm.ExpenseDate !== undefined &&
      bulkUpdateForm.ExpenseDate !== ""
    ) {
      updates.ExpenseDate = bulkUpdateForm.ExpenseDate + "T00:00:00";
    }

    if (
      bulkUpdateForm.Category !== undefined &&
      bulkUpdateForm.Category !== ""
    ) {
      updates.Category = bulkUpdateForm.Category;
    }

    // Handle DatePaid - check if set to null checkbox is checked
    if (bulkUpdateForm.setDatePaidToNull) {
      updates.DatePaid = undefined;
    } else if (
      bulkUpdateForm.DatePaid !== undefined &&
      bulkUpdateForm.DatePaid !== ""
    ) {
      updates.DatePaid = bulkUpdateForm.DatePaid + "T00:00:00";
    }

    // Apply updates to selected expenses
    setExpenses((prev) =>
      prev.map((exp) =>
        selectedExpenses.has(exp.Expense_I) ? { ...exp, ...updates } : exp
      )
    );

    // Mark cells as dirty for optimistic updates
    selectedExpenses.forEach((id) => {
      if (updates.ExpenseDate) {
        setDirtyCells((d) => ({ ...d, [`${id}-ExpenseDate`]: true }));
      }
      if (updates.Category) {
        setDirtyCells((d) => ({ ...d, [`${id}-Category`]: true }));
      }
      if (updates.DatePaid !== undefined) {
        setDirtyCells((d) => ({ ...d, [`${id}-DatePaid`]: true }));
      }
    });

    // TODO: Make API call for bulk update
    // await fetch("/api/expenses/bulk", {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     ids: Array.from(selectedExpenses),
    //     updates,
    //   }),
    // });

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

  function handleBulkDeleteConfirm() {
    // Remove selected expenses from the list
    setExpenses((prev) =>
      prev.filter((exp) => !selectedExpenses.has(exp.Expense_I))
    );

    // TODO: Make API call for bulk delete
    // await fetch("/api/expenses/bulk", {
    //   method: "DELETE",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     ids: Array.from(selectedExpenses),
    //   }),
    // });

    setBulkDeleteDialogOpen(false);
    setSelectedExpenses(new Set());
  }

  // Calculate sum of selected expenses
  function getSelectedSum(): number {
    return expenses
      .filter((exp) => selectedExpenses.has(exp.Expense_I))
      .reduce((sum, exp) => sum + (exp.Amount || 0), 0);
  }

  function hasDraftContent(): boolean {
    return (
      (draftNewRow.Expense?.trim() ?? "") !== "" ||
      (draftNewRow.Amount !== 0 && !Number.isNaN(draftNewRow.Amount)) ||
      (draftNewRow.ExpenseDate?.trim() ?? "") !== ""
    );
  }

  function commitDraftRow() {
    if (!hasDraftContent()) return;
    const tempId = nextTempIdRef.current--;
    const newExpense: Expense = {
      Expense_I: tempId,
      ExpenseDate: draftNewRow.ExpenseDate || `${month}-01T00:00:00`,
      Expense: draftNewRow.Expense?.trim() ?? "",
      Amount: draftNewRow.Amount ?? 0,
      PaymentMethod: draftNewRow.PaymentMethod ?? undefined,
      Category: draftNewRow.Category?.trim() || undefined,
      DatePaid: draftNewRow.DatePaid || undefined,
    };
    setExpenses((prev) => [...prev, newExpense]);
    setDraftNewRow({
      ExpenseDate: "",
      Expense: "",
      Amount: 0,
      PaymentMethod: undefined,
      Category: undefined,
      DatePaid: "",
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
                onClick={() => handleSort("ExpenseDate")}
              >
                Date {getSortIcon("ExpenseDate")}
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("Expense")}
              >
                Expense {getSortIcon("Expense")}
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100 select-none w-28 text-right"
                onClick={() => handleSort("Amount")}
              >
                Amount {getSortIcon("Amount")}
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("PaymentMethod")}
              >
                Method {getSortIcon("PaymentMethod")}
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("Category")}
              >
                Category {getSortIcon("Category")}
              </th>
              <th
                className="cursor-pointer hover:bg-gray-100 select-none w-32"
                onClick={() => handleSort("DatePaid")}
              >
                Date Paid {getSortIcon("DatePaid")}
              </th>
            </tr>
          </thead>
          <tbody>
            {getSortedExpenses().map((exp, r) => (
              <tr key={exp.Expense_I} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedExpenses.has(exp.Expense_I)}
                    onChange={(e) =>
                      handleSelectExpense(exp.Expense_I, e.target.checked)
                    }
                    className="cursor-pointer"
                  />
                </td>
                <td className="w-32">
                  <div className="flex items-center">
                    <Input
                      data-cell={`${r}-0`}
                      type="date"
                      value={exp.ExpenseDate?.substring(0, 10) || ""}
                      onChange={(e) =>
                        optimisticUpdate(
                          exp.Expense_I,
                          "ExpenseDate",
                          e.target.value
                        )
                      }
                    />
                    {cellBadge(exp.Expense_I, "ExpenseDate")}
                  </div>
                </td>
                <td>
                  <div className="flex items-center">
                    <Input
                      data-cell={`${r}-1`}
                      value={exp.Expense || ""}
                      onChange={(e) =>
                        optimisticUpdate(
                          exp.Expense_I,
                          "Expense",
                          e.target.value
                        )
                      }
                    />
                    {cellBadge(exp.Expense_I, "Expense")}
                  </div>
                </td>
                <td className="w-28 text-right">
                  <div className="flex items-center justify-end">
                    <Input
                      data-cell={`${r}-2`}
                      type="text"
                      step="0.01"
                      value={
                        exp.Amount !== undefined && exp.Amount !== null
                          ? Number(exp.Amount).toFixed(2)
                          : ""
                      }
                      onChange={(e) => {
                        const normalized = normalizeAmountInput(e.target.value);
                        const numValue = parseFloat(normalized) || 0;
                        optimisticUpdate(exp.Expense_I, "Amount", numValue);
                      }}
                      className={
                        exp.Amount < 0
                          ? "text-blue-600 text-right"
                          : "text-right"
                      }
                    />
                    {cellBadge(exp.Expense_I, "Amount")}
                  </div>
                </td>
                <td>
                  <Select
                    value={exp.PaymentMethod != null ? String(exp.PaymentMethod) : ""}
                    onValueChange={(v) =>
                      optimisticUpdate(
                        exp.Expense_I,
                        "PaymentMethod",
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
                  {cellBadge(exp.Expense_I, "PaymentMethod")}
                </td>
                <td>
                  <Select
                    value={exp.Category ?? ""}
                    onValueChange={(v) =>
                      optimisticUpdate(
                        exp.Expense_I,
                        "Category",
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
                  {cellBadge(exp.Expense_I, "Category")}
                </td>
                <td className="w-32">
                  <div className="flex items-center">
                    <Input
                      data-cell={`${r}-5`}
                      type="date"
                      value={exp.DatePaid?.substring(0, 10) || ""}
                      onChange={(e) =>
                        optimisticUpdate(
                          exp.Expense_I,
                          "DatePaid",
                          e.target.value
                        )
                      }
                    />
                    {cellBadge(exp.Expense_I, "DatePaid")}
                  </div>
                </td>
              </tr>
            ))}
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
                  value={draftNewRow.ExpenseDate}
                  onChange={(e) => updateDraft("ExpenseDate", e.target.value)}
                  className="bg-white/80 placeholder:italic"
                />
              </td>
              <td>
                <Input
                  placeholder="Add new expense..."
                  value={draftNewRow.Expense}
                  onChange={(e) => updateDraft("Expense", e.target.value)}
                  className="bg-white/80 placeholder:italic placeholder:text-gray-400"
                />
              </td>
              <td className="w-28 text-right">
                <Input
                  type="text"
                  value={
                    draftNewRow.Amount !== 0 && !Number.isNaN(draftNewRow.Amount)
                      ? Number(draftNewRow.Amount).toFixed(2)
                      : ""
                  }
                  onChange={(e) => {
                    const normalized = normalizeAmountInput(e.target.value);
                    updateDraft("Amount", parseFloat(normalized) || 0);
                  }}
                  placeholder="0.00"
                  className="text-right bg-white/80 placeholder:italic placeholder:text-gray-400"
                />
              </td>
              <td>
                <Select
                  value={draftNewRow.PaymentMethod != null ? String(draftNewRow.PaymentMethod) : ""}
                  onValueChange={(v) =>
                    updateDraft("PaymentMethod", v === "" ? undefined : Number(v))
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
                  value={draftNewRow.Category ?? ""}
                  onValueChange={(v) => updateDraft("Category", v === "" ? undefined : v)}
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
                  value={draftNewRow.DatePaid}
                  onChange={(e) => updateDraft("DatePaid", e.target.value)}
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
                value={bulkUpdateForm.ExpenseDate || ""}
                onChange={(e) =>
                  setBulkUpdateForm({
                    ...bulkUpdateForm,
                    ExpenseDate: e.target.value,
                  })
                }
                placeholder="Leave empty to keep current"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select
                value={bulkUpdateForm.Category || ""}
                onValueChange={(v) =>
                  setBulkUpdateForm({
                    ...bulkUpdateForm,
                    Category: v || undefined,
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
                  value={bulkUpdateForm.DatePaid || ""}
                  onChange={(e) =>
                    setBulkUpdateForm({
                      ...bulkUpdateForm,
                      DatePaid: e.target.value,
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
                        DatePaid: e.target.checked
                          ? undefined
                          : bulkUpdateForm.DatePaid,
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
