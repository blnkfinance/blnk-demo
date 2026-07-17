/** Browser-facing PayRecon admin UI. */
export function getAdminUrl() {
  return process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:8000";
}
