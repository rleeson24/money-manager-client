import { API_BASE, apiJson, USE_API } from "../config/api";
import { getAuthHeaders } from "../auth/authHeaders";
import { isAuthEnabled } from "../auth/msalConfig";

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
export type ImportSource =
  | "Arvest"
  | "AbfcuSavings"
  | "AbfcuChecking"
  | "DiscoverSavings"
  | "DiscoverChecking"
  | "DiscoverCredit";

export async function importFromFile(
  file: File,
  format: string,
  importSource: ImportSource,
  paymentMethodId: number
): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("format", format);
  form.append("importSource", importSource);
  form.append("paymentMethodId", String(paymentMethodId));

  const headers: Record<string, string> = {};
  if (USE_API && isAuthEnabled) {
    Object.assign(headers, await getAuthHeaders());
  }

  const res = await fetch(`${API_BASE}/api/import/file`, {
    method: "POST",
    headers,
    body: form,
  });

  if (res.status === 401 && USE_API && isAuthEnabled) {
    window.location.assign("/login");
    throw new Error("Unauthorized");
  }

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

/** Import sources (match backend ImportSource enum). */
export const IMPORT_SOURCES = {
  Arvest: "Arvest",
  AbfcuSavings: "AbfcuSavings",
  AbfcuChecking: "AbfcuChecking",
  DiscoverSavings: "DiscoverSavings",
  DiscoverChecking: "DiscoverChecking",
  DiscoverCredit: "DiscoverCredit",
} as const satisfies Record<string, ImportSource>;

/** Infer format from file extension. */
export function formatFromFile(file: File): string {
  void file;
  return "CSV";
}
