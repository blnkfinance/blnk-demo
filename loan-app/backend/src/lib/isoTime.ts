/** RFC 3339 UTC with second precision only (no fractional seconds). */
export function toIsoUtcNoMs(d: Date): string {
  return d.toISOString().slice(0, 19) + "Z";
}

export function tryToIsoUtcNoMsFromString(s: string): string | null {
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return null;
  return toIsoUtcNoMs(new Date(ms));
}
