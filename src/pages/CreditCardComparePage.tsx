import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button } from "../components/chatGPTUIComponents";
import PageHeader from "../components/PageHeader";
import { getExpenses, type Expense } from "../services/expenseService";
import { getPaymentMethods, type PaymentMethod } from "../services/paymentMethodService";
import { isAbortError } from "../config/api";
import {
  parseDiscoverCreditCsv,
  type ParsedCsvTransaction,
} from "../utils/discoverCreditCsvParser";
import { findExpensesMissingFromUpload } from "../utils/expenseTransactionCompare";
import "./CreditCardComparePage.css";

const compareTableColGroup = (
  <colgroup>
    <col style={{ width: 128 }} />
    <col />
    <col style={{ width: 112 }} />
  </colgroup>
);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function CreditCardComparePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentMethodId = Number.parseInt(searchParams.get("paymentMethod") ?? "", 10);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [uploaded, setUploaded] = useState<ParsedCsvTransaction[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadAbortRef = useRef<AbortController | null>(null);

  const paymentMethodName = useMemo(() => {
    const pm = paymentMethods.find((p) => p.id === paymentMethodId);
    return pm?.PaymentMethod ?? "Unknown";
  }, [paymentMethods, paymentMethodId]);

  const missingExpenses = useMemo(
    () => (uploaded.length > 0 ? findExpensesMissingFromUpload(expenses, uploaded) : []),
    [expenses, uploaded]
  );

  useEffect(() => {
    if (!Number.isFinite(paymentMethodId) || paymentMethodId <= 0) {
      setError("No payment method selected.");
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [pms, data] = await Promise.all([
          getPaymentMethods(ac.signal),
          getExpenses({
            paymentMethod: paymentMethodId,
            datePaidNull: true,
            signal: ac.signal,
          }),
        ]);
        if (ac.signal.aborted) return;
        setPaymentMethods(pms);
        setExpenses(data);
      } catch (err: unknown) {
        if (ac.signal.aborted || isAbortError(err)) return;
        console.error("Error loading compare data:", err);
        setError("Failed to load expenses for comparison.");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };

    loadAbortRef.current?.abort();
    loadAbortRef.current = ac;
    void load();

    return () => ac.abort();
  }, [paymentMethodId]);

  async function handleFileSelected(file: File) {
    setParseError(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const result = parseDiscoverCreditCsv(text);
      if (result.errors.length > 0) {
        setParseError(result.errors.join(" "));
        setUploaded([]);
        return;
      }
      setUploaded(result.transactions);
    } catch (err: unknown) {
      console.error("Error reading CSV:", err);
      setParseError("Failed to read the CSV file.");
      setUploaded([]);
    }
  }

  return (
    <div className="credit-card-compare-page w-full min-w-0">
      <PageHeader title="Compare Credit Card CSV" backTo="/expenses/creditcard">
        <span className="text-sm font-medium whitespace-nowrap">
          {paymentMethodName}
        </span>
      </PageHeader>

      <Card className="credit-card-compare-card min-w-0">
        <div className="credit-card-compare-upload">
          <label className="credit-card-compare-file-label">
            <span>Upload CSV:</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileSelected(file);
                e.target.value = "";
              }}
            />
          </label>
          {fileName ? (
            <span className="credit-card-compare-file-name">{fileName}</span>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/expenses/creditcard`)}
          >
            Back to expenses
          </Button>
        </div>

        {error ? <div className="credit-card-compare-error">{error}</div> : null}
        {parseError ? <div className="credit-card-compare-error">{parseError}</div> : null}

        {loading ? (
          <div className="credit-card-compare-loading">Loading expenses...</div>
        ) : uploaded.length === 0 ? (
          <div className="credit-card-compare-empty">
            Upload a Discover Credit CSV to compare against unpaid expenses in the
            database. Transactions are kept in memory only and are not saved.
          </div>
        ) : (
          <>
            <div className="credit-card-compare-summary">
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""} in database
              {" · "}
              {uploaded.length} transaction{uploaded.length !== 1 ? "s" : ""} in CSV
              {" · "}
              <strong>
                {missingExpenses.length} missing from CSV
              </strong>
              {" "}
              (in database but not in upload)
            </div>

            {missingExpenses.length === 0 ? (
              <div className="credit-card-compare-empty">
                All database expenses match a transaction in the uploaded CSV.
              </div>
            ) : (
              <div className="credit-card-compare-grid">
                <div className="credit-card-compare-grid-header">
                  <table className="credit-card-compare-table credit-card-compare-table--header w-full text-sm">
                    {compareTableColGroup}
                    <thead>
                      <tr>
                        <th className="p-2 text-left font-semibold w-32">Date</th>
                        <th className="p-2 text-left font-semibold">Expense</th>
                        <th className="p-2 text-left font-semibold w-28">Amount</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                <div className="credit-card-compare-table-scroll">
                  <table className="credit-card-compare-table w-full text-sm">
                    {compareTableColGroup}
                    <tbody>
                      {missingExpenses.map((exp) => (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
