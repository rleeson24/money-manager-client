/**
 * Shared helpers for amount input fields: free typing while focused,
 * format to 2 decimals on blur (e.g. "5.4" -> "5.40").
 */

/** Move '-' to the beginning of the string (for negative amounts). */
export function normalizeAmountInput(value: string): string {
  if (!value) return value;
  const endsWithDash = value.endsWith("-");
  const startsWithDash = value.startsWith("-");
  const cleaned = value.replace(/-/g, "");
  if (endsWithDash || startsWithDash) {
    return cleaned ? `-${cleaned}` : "-";
  }
  return cleaned;
}

/** Restrict to digits, one decimal, optional leading minus. "5.4.5" -> "5.45". */
export function sanitizeAmountInput(value: string): string {
  const normalized = normalizeAmountInput(value);
  const isNegative = normalized.startsWith("-");
  const withoutSign = isNegative ? normalized.slice(1) : normalized;
  const digitsAndDot = withoutSign.replace(/[^0-9.]/g, "");
  const parts = digitsAndDot.split(".");
  const oneDot =
    parts.length <= 2
      ? digitsAndDot
      : parts[0] + "." + parts.slice(1).join("");
  return isNegative ? "-" + oneDot : oneDot;
}

/** Format a valid number string to 2 decimals for display; empty or invalid returns "". */
export function formatAmountForBlur(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "-") return trimmed;
  const n = parseFloat(value);
  return Number.isNaN(n) ? "" : n.toFixed(2);
}
