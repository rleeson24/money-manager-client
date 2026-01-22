import { useEffect, useRef, useState } from "react";
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
  PaymentMethod: number;
  Category: string;
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
  const undoStack = useRef<Expense[][]>([]);
  const debounceRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>(
    {}
  );

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
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
    const filteredExpenses = mockExpenses.filter((exp) => {
      const expMonth = exp.ExpenseDate.substring(0, 7); // YYYY-MM format
      return expMonth === month;
    });

    setExpenses(filteredExpenses);
    setCategories(mockCategories);
    setPaymentMethods(mockPaymentMethods);

    // TODO: Replace with actual API calls when backend is ready
    // fetch(`/api/expenses?month=${month}`)
    //   .then((r) => r.json())
    //   .then(setExpenses);
    // fetch("/api/categories")
    //   .then((r) => r.json())
    //   .then(setCategories);
    // fetch("/api/payment-methods")
    //   .then((r) => r.json())
    //   .then(setPaymentMethods);
  }, [month]);

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

  function optimisticUpdate(id: number, field: string, value: string | number) {
    undoStack.current.push([...expenses]);

    setDirtyCells((d) => ({ ...d, [`${id}-${field}`]: true }));
    setErrorCells((e) => ({ ...e, [`${id}-${field}`]: false }));

    setExpenses((prev) =>
      prev.map((x) => (x.Expense_I === id ? { ...x, [field]: value } : x))
    );

    const key = `${id}-${field}`;
    if (debounceRef.current[key]) {
      clearTimeout(debounceRef.current[key]);
    }
    debounceRef.current[key] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/expenses/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
        if (!res.ok) throw new Error();
        setDirtyCells((d) => ({ ...d, [`${id}-${field}`]: false }));
      } catch {
        setErrorCells((e) => ({ ...e, [`${id}-${field}`]: true }));
      }
    }, 500);
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
      const aVal: string | number | undefined = a[sortColumn];
      const bVal: string | number | undefined = b[sortColumn];

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

  return (
    <Card className="m-4">
      <CardContent className="overflow-auto">
        <div className="flex justify-between mb-4">
          <header className="page-header">
            <h1>Edit Expenses - USD</h1>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-40"
            />
            <button onClick={() => navigate("/")} className="back-button">
              ← Back to Home
            </button>
          </header>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="mb-4 flex items-center gap-2">
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
        </div>

        <table className="w-full text-sm border-collapse">
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
                className="cursor-pointer hover:bg-gray-100 select-none w-28"
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
                <td className="w-28">
                  <div className="flex items-center">
                    <Input
                      data-cell={`${r}-2`}
                      type="text"
                      step="0.01"
                      value={
                        exp.Amount !== undefined && exp.Amount !== null
                          ? exp.Amount.toString()
                          : ""
                      }
                      onChange={(e) => {
                        const normalized = normalizeAmountInput(e.target.value);
                        const numValue = parseFloat(normalized) || 0;
                        optimisticUpdate(exp.Expense_I, "Amount", numValue);
                      }}
                      className={
                        exp.Amount < 0 ? "text-blue-600" : ""
                      }
                    />
                    {cellBadge(exp.Expense_I, "Amount")}
                  </div>
                </td>
                <td>
                  <Select
                    value={String(exp.PaymentMethod || "")}
                    onValueChange={(v) =>
                      optimisticUpdate(exp.Expense_I, "PaymentMethod", v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                    value={exp.Category || ""}
                    onValueChange={(v) =>
                      optimisticUpdate(exp.Expense_I, "Category", v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
          </tbody>
        </table>

        <p className="text-xs text-muted-foreground mt-2">
          ⚠ Unsaved · ❌ Error · Ctrl+Z Undo
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
  );
}
