export function withToken(path: string, token: string | null | undefined): string {
  if (!token?.trim()) {
    return path;
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}token=${encodeURIComponent(token)}`;
}
