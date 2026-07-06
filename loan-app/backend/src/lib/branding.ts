export const DEFAULT_BRANDING_PRIMARY_COLOR = "#0979C6";

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function resolveBrandingPrimaryColor(raw?: string): string {
  const value = raw?.trim();
  if (!value || !HEX_COLOR.test(value)) {
    return DEFAULT_BRANDING_PRIMARY_COLOR;
  }

  return value.toUpperCase();
}

export function isValidBrandingPrimaryColor(raw: string): boolean {
  return HEX_COLOR.test(raw.trim());
}
