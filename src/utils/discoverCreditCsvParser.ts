import { findColumn, parseCsvAmount, parseCsvDate, parseCsvRow } from "./csvParse";

export interface ParsedCsvTransaction {
  date: string;
  amount: number;
  description: string;
}

export interface DiscoverCreditParseResult {
  transactions: ParsedCsvTransaction[];
  errors: string[];
}

/**
 * Discover Credit CSV: Trans. Date, Post Date, Description, Amount, Category
 * Matches backend DiscoverCreditCsvParser behavior.
 */
export function parseDiscoverCreditCsv(text: string): DiscoverCreditParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { transactions: [], errors: ["File is empty."] };
  }

  const headers = parseCsvRow(lines[0]);
  const amountIdx = findColumn(headers, "Amount");
  const dateIdx = findColumn(headers, "Trans. Date", "Post Date");

  if (amountIdx < 0 || dateIdx < 0) {
    return {
      transactions: [],
      errors: ["Unrecognized CSV format. Expected Discover Credit columns (Trans. Date, Amount)."],
    };
  }

  const descIdx = findColumn(headers, "Description");
  const transactions: ParsedCsvTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i]);
    if (dateIdx >= cols.length || amountIdx >= cols.length) continue;

    const date = parseCsvDate(cols[dateIdx]);
    const amount = parseCsvAmount(cols[amountIdx]);
    if (date == null || amount == null) continue;

    const description =
      descIdx >= 0 && descIdx < cols.length ? cols[descIdx] ?? "" : "";

    transactions.push({ date, amount, description });
  }

  if (transactions.length === 0) {
    return {
      transactions: [],
      errors: ["No valid transactions found in the CSV."],
    };
  }

  return { transactions, errors: [] };
}
