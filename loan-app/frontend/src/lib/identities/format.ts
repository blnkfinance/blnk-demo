import type { CustomerIdentity } from "./types";

/** Person name for display; falls back to display_name when first/last are missing. */
export function formatIdentityName(identity: CustomerIdentity): string {
  const personName = [identity.first_name, identity.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return personName || identity.display_name;
}
