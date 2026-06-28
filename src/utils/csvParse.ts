/** Parse a single CSV row, handling quoted fields. */
export function parseCsvRow(line: string): string[] {
  const list: string[] = [];
  let sb = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (c === "," || c === "\t")) {
      list.push(sb.trim());
      sb = "";
      continue;
    }
    sb += c;
  }

  list.push(sb.trim());
  return list;
}

export function findColumn(headers: string[], ...names: string[]): number {
  const normalized = headers.map((h) =>
    h.trim().replace(/\s/g, "").replace(/\./g, "").toUpperCase()
  );

  for (const name of names) {
    const key = name.replace(/\s/g, "").replace(/\./g, "").toUpperCase();
    for (let i = 0; i < normalized.length; i++) {
      if (normalized[i] === key) return i;
    }
  }

  return -1;
}

export function parseCsvDate(value: string): string | null {
  if (!value?.trim()) return null;
  value = value.trim();

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0");
    const day = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().substring(0, 10);
  }

  return null;
}

/** Parse amount from strings like "56.00", "$1,234.56", "($20.00)", "-447.44". */
export function parseCsvAmount(value: string): number | null {
  if (!value?.trim()) return null;
  value = value.trim();

  const negative = value.includes("(") && value.includes(")");
  value = value.replace(/\$/g, "").replace(/,/g, "").replace(/[()]/g, "").trim();
  if (!value) return null;

  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return null;

  return negative ? -Math.abs(amount) : amount;
}
