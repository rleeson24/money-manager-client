export type DateRangePresetId =
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "this-year"
  | "last-year";

export interface DateRangePreset {
  id: DateRangePresetId;
  label: string;
}

export interface DateRange {
  fromDate: string;
  toDate: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-3-months", label: "Last 3 months" },
  { id: "last-6-months", label: "Last 6 months" },
  { id: "this-year", label: "This year" },
  { id: "last-year", label: "Last year" },
];

export function resolveDateRangePreset(
  presetId: DateRangePresetId,
  today: Date = new Date()
): DateRange {
  const year = today.getFullYear();
  const month = today.getMonth();

  switch (presetId) {
    case "this-month":
      return {
        fromDate: toDateString(startOfMonth(today)),
        toDate: toDateString(endOfMonth(today)),
      };
    case "last-month": {
      const last = new Date(year, month - 1, 1);
      return {
        fromDate: toDateString(startOfMonth(last)),
        toDate: toDateString(endOfMonth(last)),
      };
    }
    case "last-3-months": {
      const from = new Date(year, month - 2, 1);
      return {
        fromDate: toDateString(startOfMonth(from)),
        toDate: toDateString(endOfMonth(today)),
      };
    }
    case "last-6-months": {
      const from = new Date(year, month - 5, 1);
      return {
        fromDate: toDateString(startOfMonth(from)),
        toDate: toDateString(endOfMonth(today)),
      };
    }
    case "this-year":
      return {
        fromDate: `${year}-01-01`,
        toDate: `${year}-12-31`,
      };
    case "last-year":
      return {
        fromDate: `${year - 1}-01-01`,
        toDate: `${year - 1}-12-31`,
      };
  }
}
