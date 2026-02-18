/**
 * EDIT EXPENSES PAGE
 *
 * This page allows users to view and edit their expenses.
 * Users can:
 * - View a list of expenses
 * - Edit individual expenses
 * - Delete expenses
 * - Add new expenses
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Expense } from "../types/expense";
import "./EditExpenses.css";

function EditExpenses() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // State for managing expenses list
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for form
  const [formData, setFormData] = useState<Expense>({
    description: "",
    amount: 0,
    category: null,
    date: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
    notes: "",
    datePaid: null,
    id: 0,
  });

  // Load expenses on component mount
  useEffect(() => {
    loadExpenses();
  }, []);

  // Load specific expense when in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      loadExpense(id);
    }
  }, [id, isEditMode]);

  /**
   * Load all expenses
   * TODO: Replace with actual API call
   */
  const loadExpenses = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API endpoint
      // const response = await fetch('/api/expenses')
      // const data = await response.json()
      // setExpenses(data)

      // Mock data for now
      const mockExpenses: Expense[] = [
        {
          id: "1",
          description: "Groceries",
          amount: 125.5,
          category: 1,
          date: "2024-01-15",
          notes: "Weekly grocery shopping",
        },
        {
          id: "2",
          description: "Gas",
          amount: 45.0,
          category: 2,
          date: "2024-01-16",
        },
      ];
      setExpenses(mockExpenses);
    } catch (err) {
      setError("Failed to load expenses. Please try again.");
      console.error("Error loading expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load a specific expense for editing
   */
  const loadExpense = async (expenseId: string) => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/expenses/${expenseId}`)
      // const data = await response.json()
      // setFormData({ ...data })

      // Mock: Load expenses first, then find the one we need
      // In a real app, you'd fetch the specific expense directly
      const mockExpenses: Expense[] = [
        {
          id: "1",
          description: "Groceries",
          amount: 125.5,
          category: 1,
          date: "2024-01-15",
          notes: "Weekly grocery shopping",
        },
        {
          id: "2",
          description: "Gas",
          amount: 45.0,
          category: 2,
          date: "2024-01-16",
        },
      ];

      const expense = mockExpenses.find((e) => e.id.toString() === expenseId);
      if (expense) {
        setFormData({
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          notes: expense.notes || "",
          datePaid: expense.datePaid || null,
          id: expense.id,
        });
      } else {
        setError("Expense not found");
      }
    } catch (err) {
      setError("Failed to load expense. Please try again.");
      console.error("Error loading expense:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "amount"
          ? parseFloat(value) || 0
          : name === "category"
            ? (value === "" ? null : Number(value))
            : value,
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }
    if (formData.amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (formData.category == null || formData.category === undefined) {
      setError("Category is required");
      return;
    }
    if (!formData.date) {
      setError("Date is required");
      return;
    }

    try {
      if (isEditMode && id) {
        // Update existing expense
        // TODO: Replace with actual API call
        // await fetch(`/api/expenses/${id}`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(formData)
        // })

        // Mock update
        setExpenses((prev) =>
          prev.map((exp) =>
            exp.id.toString() === id ? { ...exp, ...formData } : exp
          )
        );
      } else {
        // Create new expense
        // TODO: Replace with actual API call
        // const response = await fetch('/api/expenses', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(formData)
        // })
        // const newExpense = await response.json()

        // Mock create
        const newExpense: Expense = {
          ...formData,
        };
        setExpenses((prev) => [...prev, newExpense]);
      }

      // Reset form and navigate back
      setFormData({
        description: "",
        amount: 0,
        category: null,
        date: new Date().toISOString().split("T")[0],
        notes: "",
        datePaid: null,
        id: 0,
      });

      if (isEditMode) {
        navigate("/expenses/edit");
      }
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
      // TODO: Replace with actual API call
      // await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' })

      // Mock delete
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
    navigate(`/expenses/edit/${expenseId}`);
  };

  /**
   * Start adding a new expense
   */
  const handleAddNew = () => {
    setFormData({
      description: "",
      amount: 0,
      category: null,
      date: new Date().toISOString().split("T")[0],
      notes: "",
      datePaid: null,
      id: 0,
    });
    navigate("/expenses/edit/new");
  };

  // Common expense categories (id matches API Categories table)
  const categories = [
    { id: 1, name: "Food" },
    { id: 2, name: "Transportation" },
    { id: 3, name: "Housing" },
    { id: 4, name: "Utilities" },
    { id: 5, name: "Entertainment" },
    { id: 6, name: "Healthcare" },
    { id: 7, name: "Shopping" },
    { id: 8, name: "Education" },
    { id: 9, name: "Other" },
  ];

  return (
    <div className="edit-expenses-page">
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
              <label htmlFor="description">
                Description <span className="required">*</span>
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
                type="number"
                id="amount"
                name="amount"
                value={formData.amount || ""}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">
                Category <span className="required">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category ?? ""}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">
                Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
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
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : isEditMode
                  ? "Update Expense"
                  : "Add Expense"}
              </button>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => navigate("/expenses/edit")}
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

          {loading && expenses.length === 0 ? (
            <div className="loading">Loading expenses...</div>
          ) : expenses.length === 0 ? (
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
                        {categories.find((c) => c.id === expense.category)?.name ?? expense.category}
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

export default EditExpenses;
