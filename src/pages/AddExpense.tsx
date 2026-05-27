/**
 * ADD EXPENSE PAGE
 *
 * This page allows users to view and edit their expenses.
 * Users can:
 * - View a list of expenses
 * - Edit individual expenses
 * - Delete expenses
 * - Add new expenses
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Expense } from "../types/expense";
import { sanitizeAmountInput, formatAmountForBlur } from "../utils/amountInput";
import ReactSelect, { SingleValue } from "react-select";
import { getCategories, type Category } from "../services/categoryService";
import { getPaymentMethods, type PaymentMethod } from "../services/paymentMethodService";
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from "../services/expenseService";
import {
  getSessionExpenses,
  setSessionExpenses,
} from "../utils/sessionExpenses";
import {
  buildGroupedCategoryOptions,
  getCategoryLabel,
  resolveCategorySelectValue,
} from "../utils/categoryOptions";
import {
  localDateInputToUtc,
  todayUtcExpenseDate,
  utcToLocalDateInput,
} from "../utils/expenseDate";
import "./AddExpense.css";

function expIdNum(exp: Expense | { id: string | number }): number {
  return typeof exp.id === "number" ? exp.id : parseInt(String(exp.id), 10);
}

function AddExpense() {
  const navigate = useNavigate();
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const isEditMode = editingExpenseId != null;

  // Expenses added this browser session via this page
  const [expenses, setExpenses] = useState<Expense[]>(() => getSessionExpenses());
  const [error, setError] = useState<string | null>(null);

  // State for form
  const [formData, setFormData] = useState<Expense>({
    description: "",
    amount: 0,
    category: null,
    date: todayUtcExpenseDate(),
    notes: "",
    paymentMethod: null,
    datePaid: null,
    id: 0,
  });
  const [amountStr, setAmountStr] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    Promise.all([getCategories(), getPaymentMethods()])
      .then(([categoriesData, paymentMethodsData]) => {
        setCategories(categoriesData);
        setPaymentMethods(paymentMethodsData);
      })
      .catch(console.error);
  }, []);
  useEffect(() => {
    setSessionExpenses(expenses);
  }, [expenses]);

  function populateFormFromExpense(expense: Expense) {
    setEditingExpenseId(expIdNum(expense));
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      notes: expense.notes || "",
      paymentMethod: expense.paymentMethod ?? null,
      datePaid: expense.datePaid || null,
      id: expense.id,
      modifiedDateTime: expense.modifiedDateTime,
    });
    setAmountStr(expense.amount != null ? expense.amount.toFixed(2) : "");
  }

  function getValidatedAmount(): number | null {
    const amountNum = parseFloat(formatAmountForBlur(amountStr)) || 0;
    if (amountNum <= 0) return null;
    return amountNum;
  }

  function validateForm(): string | null {
    if (!formData.description.trim()) return "Description is required";
    if (getValidatedAmount() == null) return "Amount must be greater than 0";
    if (formData.category == null || formData.category === undefined) {
      return "Category is required";
    }
    if (!formData.date) return "Date is required";
    return null;
  }

  function buildExpensePayload(amountNum: number): Omit<Expense, "id"> {
    return {
      description: formData.description.trim(),
      amount: amountNum,
      category: formData.category,
      date: formData.date,
      notes: formData.notes || null,
      paymentMethod: formData.paymentMethod ?? null,
    };
  }

  async function persistFormExpense(amountNum: number): Promise<Expense> {
    const payload = buildExpensePayload(amountNum);

    if (editingExpenseId != null) {
      const updated = await updateExpense(editingExpenseId, {
        ...payload,
        modifiedDateTime: formData.modifiedDateTime,
      });
      setExpenses((prev) =>
        prev.map((exp) => (expIdNum(exp) === editingExpenseId ? updated : exp))
      );
      setFormData((prev) => ({
        ...prev,
        ...updated,
        notes: prev.notes ?? updated.notes ?? "",
      }));
      setAmountStr(updated.amount.toFixed(2));
      return updated;
    }

    if (formData.id && formData.id !== 0) {
      const updated = await updateExpense(expIdNum(formData), {
        ...payload,
        modifiedDateTime: formData.modifiedDateTime,
      });
      setExpenses((prev) =>
        prev.map((exp) => (expIdNum(exp) === expIdNum(updated) ? updated : exp))
      );
      setFormData((prev) => ({
        ...prev,
        ...updated,
        notes: prev.notes ?? updated.notes ?? "",
      }));
      setAmountStr(updated.amount.toFixed(2));
      return updated;
    }

    const created = await createExpense(payload);
    setExpenses((prev) => [...prev, created]);
    setEditingExpenseId(expIdNum(created));
    setFormData((prev) => ({
      ...prev,
      ...created,
      notes: prev.notes ?? created.notes ?? "",
    }));
    setAmountStr(created.amount.toFixed(2));
    return created;
  }

  /**
   * Handle form input changes
   */
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "amount") return; // handled by amount input
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "category"
          ? (value === "" ? null : Number(value))
          : name === "date"
            ? localDateInputToUtc(value)
            : value,
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    const amountNum = getValidatedAmount();
    if (amountNum == null) return;

    try {
      await persistFormExpense(amountNum);

      setEditingExpenseId(null);
      setFormData({
        description: "",
        amount: 0,
        category: null,
        date: todayUtcExpenseDate(),
        notes: "",
        paymentMethod: null,
        datePaid: null,
        id: 0,
      });
      setAmountStr("");
    } catch (err) {
      setError("Failed to save expense. Please try again.");
      console.error("Error saving expense:", err);
    }
  };

  /**
   * Handle expense deletion
   */
  const handleDelete = async (expenseId: string | number) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      await deleteExpense(expIdNum({ id: expenseId }));
      setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
    } catch (err) {
      setError("Failed to delete expense. Please try again.");
      console.error("Error deleting expense:", err);
    }
  };

  /**
   * Start editing an expense
   */
  const handleEdit = (expenseId: string | number) => {
    const expense = expenses.find((exp) => exp.id === expenseId);
    if (!expense) {
      setError("Expense not found");
      return;
    }
    setError(null);
    populateFormFromExpense(expense);
  };

  function resetForm() {
    setEditingExpenseId(null);
    setFormData({
      description: "",
      amount: 0,
      category: null,
      date: todayUtcExpenseDate(),
      notes: "",
      paymentMethod: null,
      datePaid: null,
      id: 0,
    });
    setAmountStr("");
  }

  /**
   * Start adding a new expense
   */
  const handleAddNew = () => {
    resetForm();
  };

  const paymentMethodOptions = useMemo(
    () => [
      { value: "", label: "— None —" },
      ...paymentMethods.map((pm) => ({
        value: String(pm.id),
        label: pm.PaymentMethod,
      })),
    ],
    [paymentMethods]
  );

  const categoryOptions = useMemo(
    () =>
      buildGroupedCategoryOptions(categories, {
        excludeNames: ["Split"],
        activeOnly: true,
        includeNone: true,
      }),
    [categories]
  );

  return (
    <div className="add-expense-page">
      <header className="page-header">
        <h1>{isEditMode ? "Edit Expense" : "Manage Expenses"}</h1>
        <button onClick={() => navigate("/")} className="back-button">
          ← Back to Home
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="expenses-container">
        {/* Expense Form */}
        <section className="expense-form-section">
          <h2>{isEditMode ? "Edit Expense" : "Add New Expense"}</h2>

          <form onSubmit={handleSubmit} className="expense-form">
            <div className="form-group">
              <label htmlFor="date">
                Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={utcToLocalDateInput(formData.date)}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Expense <span className="required">*</span>
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                placeholder="e.g., Groceries, Gas, Rent"
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount">
                Amount <span className="required">*</span>
              </label>
              <input
                type="text"
                id="amount"
                name="amount"
                value={amountStr}
                onChange={(e) => setAmountStr(sanitizeAmountInput(e.target.value))}
                onBlur={() => {
                  const formatted = formatAmountForBlur(amountStr);
                  setAmountStr(formatted);
                  setFormData((prev) => ({
                    ...prev,
                    amount: parseFloat(formatted) || 0,
                  }));
                }}
                required
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="paymentMethod">Method</label>
              <ReactSelect
                classNamePrefix="pm-select"
                isClearable
                isSearchable
                options={paymentMethodOptions}
                value={
                  formData.paymentMethod != null
                    ? paymentMethodOptions.find(
                        (o) => o.value === String(formData.paymentMethod)
                      ) ?? null
                    : paymentMethodOptions.find((o) => o.value === "") ?? null
                }
                onChange={(opt: SingleValue<{ value: string; label: string }>) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentMethod:
                      !opt || opt.value === "" ? null : Number(opt.value),
                  }))
                }
                placeholder="Select a payment method"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">
                Category <span className="required">*</span>
              </label>
              <ReactSelect
                classNamePrefix="cat-select"
                isClearable
                isSearchable
                options={categoryOptions}
                value={resolveCategorySelectValue(categoryOptions, formData.category)}
                onChange={(opt: SingleValue<{ value: string; label: string }>) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: !opt || opt.value === "" ? null : Number(opt.value),
                  }))
                }
                placeholder="Select a category"
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes (Optional)</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes || ""}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional notes about this expense..."
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="submit-button"
              >
                {isEditMode ? "Update Expense" : "Add Expense"}
              </button>
              {isEditMode && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="cancel-button"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Expenses List */}
        <section className="expenses-list-section">
          <div className="section-header">
            <h2>All Expenses</h2>
            <button onClick={handleAddNew} className="add-button">
              + Add New Expense
            </button>
          </div>

          {expenses.length === 0 ? (
            <div className="empty-state">
              <p>No expenses found. Add your first expense above!</p>
            </div>
          ) : (
            <div className="expenses-list">
              {expenses.map((expense) => (
                <div key={expense.id} className="expense-card">
                  <div className="expense-info">
                    <h3>{expense.description}</h3>
                    <div className="expense-details">
                      <span className="expense-amount">
                        ${expense.amount.toFixed(2)}
                      </span>
                      <span className="expense-category">
                        {getCategoryLabel(expense.category, categories)}
                      </span>
                      <span className="expense-date">
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                    </div>
                    {expense.notes && (
                      <p className="expense-notes">{expense.notes}</p>
                    )}
                  </div>
                  <div className="expense-actions">
                    <button
                      onClick={() => handleEdit(expense.id)}
                      className="edit-button"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AddExpense;
