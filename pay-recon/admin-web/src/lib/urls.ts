/** Browser-facing Horizon Bank UI base. */
export function getHorizonUrl() {
  return process.env.NEXT_PUBLIC_HORIZON_URL ?? "http://localhost:8080";
}

/** Browser-facing PayRecon admin UI base (used from Horizon). */
export function getAdminUrl() {
  return process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:8000";
}

/** Format kobo as a naira amount string for query params. */
export function koboToNairaParam(kobo: number) {
  return (kobo / 100).toFixed(2);
}
