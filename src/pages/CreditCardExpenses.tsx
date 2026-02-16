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
} from "../components/chatGPTUIComponents";
import { getExpenses, updateExpense, type Expense } from "../services/expenseService";
import { getPaymentMethods, type PaymentMethod } from "../services/paymentMethodService";
import { getCategories, type Category } from "../services/categoryService";
import "./CreditCardExpenses.css";

interface CellState {
  [key: string]: boolean;
}

type SortDirection = "asc" | "desc" | null;
type SortColumn =
  | "date"
  | "description"
  | "amount"
  | "category"
  | "datePaid"
  | null;

export default function CreditCardExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null);
  const [excludedExpenses, setExcludedExpenses] = useState<Set<number>>(new Set());
  const [dirtyCells, setDirtyCells] = useState<CellState>({});
  const [errorCells, setErrorCells] = useState<CellState>({});
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const undoStack = useRef<Expense[][]>([]);
  const debounceRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  const navigate = useNavigate();

  // Load payment methods and set default to "Discover"
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const data = await getPaymentMethods();
        setPaymentMethods(data);
        
        // Find and set "Discover" as default
        const discover = data.find((pm: PaymentMethod) => 
          pm.PaymentMethod.toLowerCase() === "discover"
        );
        if (discover) {
          setSelectedPaymentMethod(discover.ID);
        } else if (data.length > 0) {
          // Fallback to first payment method if Discover not found
          setSelectedPaymentMethod(data[0].ID);
        }
      } catch (err) {
        console.error("Error loading payment methods:", err);
        setError("Failed to load payment methods");
      }
    };

    loadPaymentMethods();
  }, []);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    };

    loadCategories();
  }, []);

  // Load expenses when payment method is selected
  useEffect(() => {
    if (selectedPaymentMethod !== null) {
      loadExpenses();
    }
  }, [selectedPaymentMethod]);

  const loadExpenses = async () => {
    if (selectedPaymentMethod === null) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getExpenses({
        paymentMethod: selectedPaymentMethod,
        datePaidNull: true,
      });
      setExpenses(data);
      // Clear excluded expenses when loading new data
      setExcludedExpenses(new Set());
    } catch (err) {
      console.error("Error loading expenses:", err);
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

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
    
    const endsWithDash = value.endsWith('-');
    const startsWithDash = value.startsWith('-');
    const cleaned = value.replace(/-/g, '');
    
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
      prev.map((x) => ((typeof x.id === "number" ? x.id : parseInt(String(x.id), 10)) === id ? { ...x, [field]: value } : x))
    );

    const key = `${id}-${field}`;
    if (debounceRef.current[key]) {
      clearTimeout(debounceRef.current[key]);
    }
    debounceRef.current[key] = setTimeout(async () => {
      try {
        await updateExpense(id, { [field]: value } as Partial<Expense>);
        setDirtyCells((d) => ({ ...d, [`${id}-${field}`]: false }));
      } catch {
        setErrorCells((e) => ({ ...e, [`${id}-${field}`]: true }));
      }
    }, 1000);
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
      const aVal: string | number | null | undefined = a[sortColumn as keyof Expense];
      const bVal: string | number | null | undefined = b[sortColumn as keyof Expense];

      if (sortColumn === "date" || sortColumn === "datePaid") {
        const aDate = aVal ? new Date(aVal as string).getTime() : 0;
        const bDate = bVal ? new Date(bVal as string).getTime() : 0;
        if (aDate < bDate) return sortDirection === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortColumn === "amount") {
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

  // Handle exclude checkbox
  function handleExcludeToggle(expenseId: number, checked: boolean) {
    const newExcluded = new Set(excludedExpenses);
    if (checked) {
      newExcluded.add(expenseId);
    } else {
      newExcluded.delete(expenseId);
    }
    setExcludedExpenses(newExcluded);
  }

  function expIdNum(exp: Expense): number {
    return typeof exp.id === "number" ? exp.id : parseInt(String(exp.id), 10);
  }

  // Calculate Credit Owed (sum of all amounts except excluded)
  function calculateCreditOwed(): number {
    return expenses
      .filter((exp) => !excludedExpenses.has(expIdNum(exp)))
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }

  // Mark selected expenses as paid
  function handleMarkAsPaid() {
    const today = new Date().toISOString().split("T")[0];
    const toUpdate = expenses.filter((exp) => !excludedExpenses.has(expIdNum(exp)));
    
    if (toUpdate.length === 0) {
      setError("No expenses selected to mark as paid");
      return;
    }

    toUpdate.forEach((exp) => {
      optimisticUpdate(expIdNum(exp), "datePaid", today);
    });

    // After a delay, reload expenses to refresh the list
    setTimeout(() => {
      loadExpenses();
    }, 1000);
  }

  // Format currency
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  return (
    <Card className="m-4">
      <CardContent className="overflow-auto">
        <div className="flex justify-between mb-4">
          <header className="page-header">
            <h1>Credit Card Expenses</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Payment Method:</label>
                <Select
                  value={selectedPaymentMethod?.toString() || ""}
                  onValueChange={(v) => setSelectedPaymentMethod(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.ID} value={pm.ID.toString()}>
                        {pm.PaymentMethod}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button onClick={() => navigate("/")} className="back-button">
                ← Back to Home
              </button>
            </div>
          </header>

          {error && <div className="error-message">{error}</div>}
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="w-12">
                    <span className="text-xs">Excl</span>
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
                    className="cursor-pointer hover:bg-gray-100 select-none w-28"
                    onClick={() => handleSort("amount")}
                  >
                    Amount {getSortIcon("amount")}
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
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={excludedExpenses.has(id)}
                        onChange={(e) =>
                          handleExcludeToggle(id, e.target.checked)
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
                            optimisticUpdate(id, "date", e.target.value)
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
                            optimisticUpdate(id, "description", e.target.value)
                          }
                        />
                        {cellBadge(id, "description")}
                      </div>
                    </td>
                    <td className="w-28">
                      <div className="flex items-center">
                        <Input
                          data-cell={`${r}-2`}
                          type="text"
                          value={
                            exp.amount !== undefined && exp.amount !== null
                              ? exp.amount.toString()
                              : ""
                          }
                          onChange={(e) => {
                            const normalized = normalizeAmountInput(e.target.value);
                            const numValue = parseFloat(normalized) || 0;
                            optimisticUpdate(id, "amount", numValue);
                          }}
                          className={exp.amount < 0 ? "text-blue-600" : ""}
                        />
                        {cellBadge(id, "amount")}
                      </div>
                    </td>
                    <td>
                      <Select
                        value={exp.category || ""}
                        onValueChange={(v) =>
                          optimisticUpdate(id, "category", v)
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
                      {cellBadge(id, "category")}
                    </td>
                    <td className="w-32">
                      <div className="flex items-center">
                        <Input
                          data-cell={`${r}-5`}
                          type="date"
                          value={exp.datePaid?.substring(0, 10) || ""}
                          onChange={(e) =>
                            optimisticUpdate(id, "datePaid", e.target.value)
                          }
                        />
                        {cellBadge(id, "datePaid")}
                      </div>
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>

            <p className="text-xs text-muted-foreground mt-2">
              ⚠ Unsaved · ❌ Error · Ctrl+Z Undo
            </p>
          </>
        )}

        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <Button onClick={handleMarkAsPaid} variant="primary">
            Mark as paid
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Credit Owed:</span>
            <Input
              type="text"
              value={formatCurrency(calculateCreditOwed())}
              readOnly
              className="w-32 text-right font-semibold"
            />
          </div>
          <Button onClick={loadExpenses} variant="secondary">
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
