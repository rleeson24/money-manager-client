/** YYYY-MM-DD for `<input type="date">` in the user's local timezone. */
export function todayLocalDateInput(): string {
  return formatLocalDateParts(new Date());
}

/** UTC ISO string for the start of today's local calendar date. */
export function todayUtcExpenseDate(): string {
  return localDateInputToUtc(todayLocalDateInput());
}

/** Convert a UTC (or parseable) expense date to a local date input value. */
export function utcToLocalDateInput(utcValue: string | null | undefined): string {
  if (!utcValue?.trim()) return "";

  const trimmed = utcValue.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";

  return formatLocalDateParts(parsed);
}

/** Convert a local date input value to a UTC ISO string (local midnight). */
export function localDateInputToUtc(localDateStr: string): string {
  const trimmed = localDateStr.trim();
  if (!trimmed) return "";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return trimmed;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const localMidnight = new Date(year, month - 1, day, 0, 0, 0, 0);
  return localMidnight.toISOString();
}

function formatLocalDateParts(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
