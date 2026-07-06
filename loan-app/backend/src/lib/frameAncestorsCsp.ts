const BLNK_CLOUD_ANCESTORS = [
  "'self'",
  "https://blnkfinance.com",
  "https://*.blnkfinance.com",
  "https://core.omnigroup.tech",
  "https://*.omnigroup.tech",
  "https://omnicore.up.railway.app",
] as const;

/** CSP value for iframe embedding inside Omni Cloud. */
export function buildFrameAncestorsCsp(): string {
  const ancestors: string[] = [...BLNK_CLOUD_ANCESTORS];

  const extra = process.env.FRAME_ANCESTORS_EXTRA?.trim();
  if (extra) {
    ancestors.push(...extra.split(/\s+/).filter(Boolean));
  }

  return `frame-ancestors ${ancestors.join(" ")}`;
}
