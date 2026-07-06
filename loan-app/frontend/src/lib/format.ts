export function formatNumberWithCommas(
  num: number,
  decimalPoints?: number
): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPoints,
    maximumFractionDigits: decimalPoints,
  }).format(num);
}

/** Strip commas and keep digits with at most one decimal point (max 2 fractional digits). */
export function sanitizeMoneyInput(raw: string): string {
  const withoutCommas = raw.replace(/,/g, "");
  let result = "";
  let hasDecimal = false;

  for (const char of withoutCommas) {
    if (char >= "0" && char <= "9") {
      result += char;
    } else if (char === "." && !hasDecimal) {
      hasDecimal = true;
      result += char;
    }
  }

  const dotIndex = result.indexOf(".");
  if (dotIndex !== -1) {
    result =
      result.slice(0, dotIndex + 1) + result.slice(dotIndex + 1, dotIndex + 3);
  }

  return result;
}

/** Format a money input string with thousands separators while typing. */
export function formatMoneyInputDisplay(raw: string): string {
  const cleaned = sanitizeMoneyInput(raw);
  if (!cleaned) return "";

  const endsWithDot = cleaned.endsWith(".");
  const [whole = "", fraction] = cleaned.split(".");

  if (whole === "" && fraction !== undefined) {
    return `.${fraction}`;
  }

  const formattedWhole =
    whole === "" ? "" : formatNumberWithCommas(Number(whole));

  if (fraction !== undefined) {
    return endsWithDot && fraction === ""
      ? `${formattedWhole}.`
      : `${formattedWhole}.${fraction}`;
  }

  return formattedWhole;
}

/** Parse a formatted money input to minor currency units (centavos). */
export function parseMoneyInputToMinor(value: string): number | null {
  if (/^\s*-/.test(value)) return null;
  const trimmed = sanitizeMoneyInput(value);
  if (!trimmed || trimmed === ".") return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

const displayDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function parseDisplayDateInput(iso: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const normalized = iso.includes("T") ? iso : iso.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/** e.g. "Jun 1, 2321" */
export function formatDisplayDate(iso: string): string {
  const date = parseDisplayDateInput(iso);
  if (!date) {
    return iso;
  }

  return displayDateFormatter.format(date);
}

const displayDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

/** e.g. "Jun 28, 2026, 2:07 AM" */
export function formatDisplayDateTime(iso: string): string {
  const date = parseDisplayDateInput(iso);
  if (!date) {
    return iso;
  }

  return displayDateTimeFormatter.format(date);
}

export function formatTableDate(iso: string): string {
  return formatDisplayDate(iso);
}

/** Parse YYYY-MM-DD to a local calendar date (no time component). */
export function parseIsoDateOnly(iso: string): Date | undefined {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!dateOnly) return undefined;

  const year = Number(dateOnly[1]);
  const month = Number(dateOnly[2]);
  const day = Number(dateOnly[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

/** Format a local calendar date as YYYY-MM-DD. */
export function toIsoDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function subtractYearsLocal(date: Date, years: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setFullYear(copy.getFullYear() - years);
  return copy;
}
