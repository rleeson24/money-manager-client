import { API_BASE, apiJson } from "../config/api";

export interface ImportResult {
  created: number;
  skippedDuplicates: number;
  errors: string[];
}

export interface LastImportDatesItem {
  paymentMethodId: number;
  latestExpenseDate: string | null;
  latestDatePaid: string | null;
}

/**
 * POST /api/import/file — upload file and import transactions.
 */
export async function importFromFile(
  file: File,
  format: string,
  sourceKey: string,
  paymentMethodId: number
): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("format", format);
  form.append("sourceKey", sourceKey);
  form.append("paymentMethodId", String(paymentMethodId));

  const res = await fetch(`${API_BASE}/api/import/file`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let body: unknown;
    const ct = res.headers.get("content-type");
    try {
      body = ct?.includes("application/json") ? await res.json() : await res.text();
    } catch {
      body = undefined;
    }
    throw new Error(
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: string }).error)
        : `Import failed: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as {
    created?: number;
    skippedDuplicates?: number;
    errors?: string[];
  };
  return {
    created: data.created ?? 0,
    skippedDuplicates: data.skippedDuplicates ?? 0,
    errors: Array.isArray(data.errors) ? data.errors : [],
  };
}

/**
 * GET /api/import/last-import-dates?paymentMethodIds=1,2,3 — returns latest ExpenseDate and DatePaid per payment method.
 */
export async function getLastImportDates(
  paymentMethodIds: number[],
  errorMessage = "Failed to fetch last import dates"
): Promise<LastImportDatesItem[]> {
  if (paymentMethodIds.length === 0) return [];
  const query = paymentMethodIds.join(",");
  const data = await apiJson<LastImportDatesItem[]>(
    `/api/import/last-import-dates?paymentMethodIds=${encodeURIComponent(query)}`,
    {},
    errorMessage
  );
  return Array.isArray(data) ? data : [];
}

/** Source keys for import (match backend). */
export const IMPORT_SOURCE_KEYS = {
  Arvest: "Arvest",
  ABFCUSavings: "ABFCU Savings",
  ABFCUChecking: "ABFCU Checking",
  DiscoverSavings: "Discover Savings",
  DiscoverChecking: "Discover Checking",
  DiscoverCredit: "Discover Credit",
} as const;

/** Infer format from file extension. */
export function formatFromFile(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith(".qfx")) return "QFX";
  if (name.endsWith(".ofx")) return "OFX";
  if (name.endsWith(".csv")) return "CSV";
  return "CSV";
}
