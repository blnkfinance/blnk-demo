/** Format kobo as ₦ with thousands separators. */
export function formatNGN(kobo: number | null | undefined): string {
  if (kobo == null || Number.isNaN(kobo)) return "—";
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Parse a naira string (e.g. "2000000.50") into kobo. */
export function nairaToKobo(naira: string): number {
  const cleaned = naira.replace(/,/g, "").trim();
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Invalid amount");
  }
  return Math.round(value * 100);
}
