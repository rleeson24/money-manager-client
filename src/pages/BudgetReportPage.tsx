import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input } from "../components/chatGPTUIComponents";
import { isAbortError } from "../config/api";
import { useApiReady } from "../hooks/useApiReady";
import { getBudgetReport, type BudgetReport, type BudgetReportCategory } from "../services/budgetReportService";
import "./BudgetReportPage.css";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatShare(amount: number, percent: number): string {
  if (amount <= 0) return "—";
  return `${percent.toFixed(1)}%`;
}

export default function BudgetReportPage() {
  const apiReady = useApiReady();
  const [month, setMonth] = useState(currentMonthValue);
  const [report, setReport] = useState<BudgetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiReady) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    getBudgetReport(month, ac.signal)
      .then((data) => {
        if (!ac.signal.aborted) setReport(data);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted || isAbortError(err)) return;
        console.error("Error loading budget report:", err);
        setError("Failed to load the budget report.");
        setReport(null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [month, apiReady]);

  const spending = useMemo(
    () => (report?.categories ?? []).filter((category) => category.amount > 0),
    [report]
  );
  const credits = useMemo(
    () => (report?.categories ?? []).filter((category) => category.amount < 0),
    [report]
  );
  const largest = spending[0] ?? null;
  const uncategorized = spending.find((category) => category.categoryId == null) ?? null;
  const monthLabel = formatMonthLabel(month);

  return (
    <div className="budget-report-page">
      <Card className="budget-report-card">
        <div className="budget-report-toolbar">
          <div className="budget-report-month">
            <label htmlFor="budget-month">Month</label>
            <div className="budget-report-month__controls">
              <Button
                type="button"
                variant="secondary"
                aria-label="Previous month"
                onClick={() => setMonth((current) => shiftMonth(current, -1))}
              >
                ‹
              </Button>
              <Input
                id="budget-month"
                type="month"
                value={month}
                onChange={(event) => {
                  if (event.target.value) setMonth(event.target.value);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                aria-label="Next month"
                onClick={() => setMonth((current) => shiftMonth(current, 1))}
              >
                ›
              </Button>
            </div>
          </div>
          <p className="budget-report-intro">
            Spending for {monthLabel}, grouped so you can set next month&apos;s category budgets.
          </p>
        </div>

        {error ? <div className="budget-report-error">{error}</div> : null}

        {loading ? (
          <div className="budget-report-status">Loading budget report...</div>
        ) : report && spending.length === 0 && credits.length === 0 ? (
          <div className="budget-report-status">No expenses recorded for {monthLabel}.</div>
        ) : report ? (
          <div className="budget-report-body">
            <div className="budget-report-summary">
              <div>
                <span className="budget-report-summary__label">Spent</span>
                <strong>{formatCurrency(report.totalSpent)}</strong>
              </div>
              <div>
                <span className="budget-report-summary__label">Largest category</span>
                <strong>{largest ? largest.name : "—"}</strong>
                {largest ? (
                  <span className="budget-report-summary__detail">
                    {formatCurrency(largest.amount)} · {formatShare(largest.amount, largest.percentOfTotal)}
                  </span>
                ) : null}
              </div>
              <div>
                <span className="budget-report-summary__label">Transactions</span>
                <strong>{report.transactionCount}</strong>
              </div>
            </div>

            {uncategorized ? (
              <div className="budget-report-callout">
                {formatCurrency(uncategorized.amount)} is uncategorized. Assign categories before you
                use this month to plan the next one.
              </div>
            ) : null}

            {spending.length > 0 ? (
              <ReportTable
                headingId="budget-spending-heading"
                title={credits.length > 0 ? "Spending" : "Spending by category"}
                categories={spending}
                totalLabel="Total spent"
                totalAmount={report.totalSpent}
                showShare
              />
            ) : (
              <div className="budget-report-status">No spending recorded for {monthLabel}.</div>
            )}

            {credits.length > 0 ? (
              <ReportTable
                headingId="budget-credits-heading"
                title="Income and credits"
                categories={credits}
                totalLabel="Total credits"
                totalAmount={credits.reduce((sum, category) => sum + category.amount, 0)}
                showShare={false}
              />
            ) : null}

            <p className="budget-report-note">
              Child categories roll up to their parent, which is the amount to budget for that group.
              Split purchases count under each split category. Refunds reduce the category they belong
              to. Share compares each amount with total spending.
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function ReportTable({
  headingId,
  title,
  categories,
  totalLabel,
  totalAmount,
  showShare,
}: {
  headingId: string;
  title: string;
  categories: BudgetReportCategory[];
  totalLabel: string;
  totalAmount: number;
  showShare: boolean;
}) {
  const transactionCount = categories.reduce((sum, category) => sum + category.transactionCount, 0);

  return (
    <section className="budget-report-section" aria-labelledby={headingId}>
      <h2 id={headingId} className="budget-report-section__title">
        {title}
      </h2>
      <div className="budget-report-table-wrap">
        <table className="budget-report-table">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="budget-report-num">
                Amount
              </th>
              <th scope="col" className="budget-report-share-col">
                Share
              </th>
              <th scope="col" className="budget-report-num">
                Transactions
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <CategoryRows key={category.categoryId ?? "uncategorized"} category={category} showShare={showShare} />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{totalLabel}</th>
              <td className={`budget-report-num ${totalAmount < 0 ? "budget-report-amount--credit" : ""}`}>
                {formatCurrency(totalAmount)}
              </td>
              <td>{showShare && totalAmount > 0 ? "100%" : "—"}</td>
              <td className="budget-report-num">{transactionCount}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function CategoryRows({
  category,
  showShare,
}: {
  category: BudgetReportCategory;
  showShare: boolean;
}) {
  const hasLines = category.lines.length > 0;
  return (
    <>
      <tr className={hasLines ? "budget-report-row budget-report-row--parent" : "budget-report-row"}>
        <th scope="row">{category.name}</th>
        <AmountCell amount={category.amount} />
        <td>{showShare ? <Share amount={category.amount} percent={category.percentOfTotal} /> : "—"}</td>
        <td className="budget-report-num">{category.transactionCount}</td>
      </tr>
      {category.lines.map((line) => (
        <tr
          key={`${line.categoryId ?? "none"}-${line.isDirect ? "direct" : "child"}`}
          className="budget-report-row budget-report-row--child"
        >
          <th scope="row">
            {line.name}
            {line.isDirect ? <span className="budget-report-direct"> assigned directly</span> : null}
          </th>
          <AmountCell amount={line.amount} />
          <td>{showShare ? <Share amount={line.amount} percent={line.percentOfTotal} /> : "—"}</td>
          <td className="budget-report-num">{line.transactionCount}</td>
        </tr>
      ))}
    </>
  );
}

function AmountCell({ amount }: { amount: number }) {
  return (
    <td className={`budget-report-num ${amount < 0 ? "budget-report-amount--credit" : ""}`}>
      {formatCurrency(amount)}
    </td>
  );
}

function Share({ amount, percent }: { amount: number; percent: number }) {
  if (amount <= 0) return <span className="budget-report-share__empty">—</span>;
  return (
    <span className="budget-report-share">
      <span className="budget-report-share__label">{formatShare(amount, percent)}</span>
      <span className="budget-report-share__track" aria-hidden>
        <span
          className="budget-report-share__bar"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </span>
    </span>
  );
}
