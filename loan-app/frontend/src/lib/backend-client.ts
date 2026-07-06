export function getBackendPublicUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_PUBLIC_URL?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_BACKEND_PUBLIC_URL is not set");
  }
  return url.replace(/\/$/, "");
}

export async function backendFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const base = getBackendPublicUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${base}${normalizedPath}`, init);
}
