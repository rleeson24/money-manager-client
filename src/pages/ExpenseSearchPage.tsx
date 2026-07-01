import { useEffect, useMemo, useRef, useState } from "react";
import ReactSelect, { SingleValue } from "react-select";
import { Card, Button, Input, Select, SelectItem } from "../components/chatGPTUIComponents";
import PageHeader from "../components/PageHeader";
import { searchExpenses, type Expense } from "../services/expenseService";
import { getCategories, type Category } from "../services/categoryService";
import { isAbortError } from "../config/api";
import {
  buildGroupedCategoryOptions,
  getCategoryLabel,
  resolveCategorySelectValue,
  type CategoryOption,
} from "../utils/categoryOptions";
import {
  DATE_RANGE_PRESETS,
  resolveDateRangePreset,
  type DateRangePresetId,
} from "../utils/dateRangePresets";
import "./ExpenseSearchPage.css";

const searchTableColGroup = (
  <colgroup>
    <col style={{ width: 128 }} />
    <col />
    <col style={{ width: 112 }} />
    <col style={{ width: 180 }} />
  </colgroup>
);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function ExpenseSearchPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePresetId>("this-month");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [includeChildCategories, setIncludeChildCategories] = useState(false);
  const [results, setResults] = useState<Expense[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const categoryOptions = useMemo(
    () => buildGroupedCategoryOptions(categories, { activeOnly: true }),
    [categories]
  );

  const selectedCategory = useMemo(
    () =>
      selectedCategoryId != null
        ? categories.find((c) => c.category_I === selectedCategoryId) ?? null
        : null,
    [categories, selectedCategoryId]
  );

  const showChildCategoriesCheckbox = Boolean(
    selectedCategory?.hasChildren && selectedCategory.parentCategory_I == null
  );

  useEffect(() => {
    const ac = new AbortController();
    void getCategories(ac.signal, true)
      .then(setCategories)
      .catch((err: unknown) => {
        if (ac.signal.aborted || isAbortError(err)) return;
        console.error("Error loading categories:", err);
        setError("Failed to load categories.");
      });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!showChildCategoriesCheckbox) {
      setIncludeChildCategories(false);
    }
  }, [showChildCategoriesCheckbox]);

  async function handleSearch() {
    const trimmedSearch = searchTerm.trim();
    const hasSearch = trimmedSearch.length > 0;
    const hasCategory = selectedCategoryId != null;

    if (!hasSearch && !hasCategory) {
      setValidationError("Enter a description search term or select a category.");
      return;
    }

    setValidationError(null);
    setError(null);

    const range = resolveDateRangePreset(dateRangePreset);
    searchAbortRef.current?.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;
    setLoading(true);

    try {
      const data = await searchExpenses({
        fromDate: range.fromDate,
        toDate: range.toDate,
        search: hasSearch ? trimmedSearch : undefined,
        category: hasCategory ? selectedCategoryId! : undefined,
        includeChildCategories: hasCategory ? includeChildCategories : undefined,
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;
      setResults(data);
    } catch (err: unknown) {
      if (ac.signal.aborted || isAbortError(err)) return;
      console.error("Error searching expenses:", err);
      setError("Failed to search expenses.");
      setResults([]);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }

  function handleCategoryChange(
    opt: SingleValue<CategoryOption>
  ) {
    setSelectedCategoryId(opt?.value ? Number(opt.value) : null);
  }

  return (
    <div className="expense-search-page w-full min-w-0">
      <PageHeader title="Search Expenses" />

      <Card className="expense-search-card min-w-0">
        <div className="expense-search-toolbar">
          <div className="expense-search-field expense-search-field--range">
            <label htmlFor="date-range-preset">Date range</label>
            <Select
              value={dateRangePreset}
              onValueChange={(value) => setDateRangePreset(value as DateRangePresetId)}
            >
              {DATE_RANGE_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="expense-search-field expense-search-field--search">
            <label htmlFor="expense-search-term">Description</label>
            <Input
              id="expense-search-term"
              type="search"
              placeholder="Search description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSearch();
              }}
            />
          </div>

          <div className="expense-search-field expense-search-field--category">
            <label htmlFor="expense-search-category">Category</label>
            <ReactSelect
              inputId="expense-search-category"
              classNamePrefix="cat-select"
              isClearable
              isSearchable
              options={categoryOptions}
              value={resolveCategorySelectValue(categoryOptions, selectedCategoryId)}
              onChange={handleCategoryChange}
              placeholder="Filter by category..."
            />
          </div>

          {showChildCategoriesCheckbox ? (
            <label className="expense-search-child-checkbox">
              <input
                type="checkbox"
                checked={includeChildCategories}
                onChange={(e) => setIncludeChildCategories(e.target.checked)}
              />
              Include child categories
            </label>
          ) : null}

          <Button type="button" onClick={() => void handleSearch()} disabled={loading}>
            Search
          </Button>
        </div>

        {validationError ? (
          <div className="expense-search-error">{validationError}</div>
        ) : null}
        {error ? <div className="expense-search-error">{error}</div> : null}

        {loading ? (
          <div className="expense-search-loading">Searching...</div>
        ) : results === null ? (
          <div className="expense-search-empty">
            Choose a date range and enter a description or category, then click Search.
          </div>
        ) : results.length === 0 ? (
          <div className="expense-search-empty">No expenses match your search.</div>
        ) : (
          <>
            <div className="expense-search-summary">
              {results.length} expense{results.length !== 1 ? "s" : ""} found
            </div>
            <div className="expense-search-grid">
              <div className="expense-search-grid-header">
                <table className="expense-search-table expense-search-table--header w-full text-sm">
                  {searchTableColGroup}
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-semibold w-32">Date</th>
                      <th className="p-2 text-left font-semibold">Expense</th>
                      <th className="p-2 text-left font-semibold w-28">Amount</th>
                      <th className="p-2 text-left font-semibold w-44">Category</th>
                    </tr>
                  </thead>
                </table>
              </div>

              <div className="expense-search-table-scroll">
                <table className="expense-search-table w-full text-sm">
                  {searchTableColGroup}
                  <tbody>
                    {results.map((exp) => (
                      <tr
                        key={exp.id}
                        className="border-b border-gray-200 dark:border-gray-600 even:bg-gray-50/50 dark:even:bg-slate-800/50"
                      >
                        <td className="w-32 p-2 align-middle">
                          {exp.date?.substring(0, 10) ?? ""}
                        </td>
                        <td className="p-2 align-middle">{exp.description}</td>
                        <td
                          className={`w-28 p-2 align-middle text-right ${
                            exp.amount < 0 ? "text-blue-600" : ""
                          }`}
                        >
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="w-44 p-2 align-middle">
                          {getCategoryLabel(exp.category, categories)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
