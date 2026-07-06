import type { InstallRow } from "../../db/index.js";
import { decryptSecret } from "../crypto.js";
import { assertInstallPermission, blnkDataGetJson } from "./cloudClient.js";

export type CustomerIdentity = {
  identity_id: string;
  first_name: string | null;
  last_name: string | null;
  email_address: string | null;
  display_name: string;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && /\(\s*404\s*\)/.test(err.message);
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function normalizeIdentity(raw: Record<string, unknown>): CustomerIdentity | null {
  const identity_id = optionalString(raw.identity_id);
  if (!identity_id) return null;

  const first_name = optionalString(raw.first_name);
  const last_name = optionalString(raw.last_name);
  const combined_name = optionalString(raw.name);
  const email_address =
    optionalString(raw.email_address) ?? optionalString(raw.email);
  const organization_name = optionalString(raw.organization_name);

  const personName =
    [first_name, last_name].filter(Boolean).join(" ").trim() || combined_name || "";
  const display_name = personName || organization_name || identity_id;

  return {
    identity_id,
    first_name,
    last_name,
    email_address,
    display_name,
  };
}

function parseIdentityList(raw: unknown, limit: number): CustomerIdentity[] {
  if (!isRecord(raw)) return [];
  const data = raw.data;
  if (!Array.isArray(data)) return [];

  const seen = new Set<string>();
  const identities: CustomerIdentity[] = [];

  for (const row of data) {
    if (!isRecord(row)) continue;
    const identity = normalizeIdentity(row);
    if (!identity || seen.has(identity.identity_id)) continue;
    seen.add(identity.identity_id);
    identities.push(identity);
    if (identities.length >= limit) break;
  }

  return identities;
}

function mergeIdentities(lists: CustomerIdentity[][], limit: number): CustomerIdentity[] {
  const seen = new Set<string>();
  const merged: CustomerIdentity[] = [];

  for (const list of lists) {
    for (const identity of list) {
      if (seen.has(identity.identity_id)) continue;
      seen.add(identity.identity_id);
      merged.push(identity);
      if (merged.length >= limit) return merged;
    }
  }

  return merged;
}

export async function getIdentityById(
  install: InstallRow,
  identityId: string
): Promise<CustomerIdentity | null> {
  assertInstallPermission(install, "data:read");
  const bearer = decryptSecret(install.api_key_encrypted);

  try {
    const raw = await blnkDataGetJson(
      bearer,
      `/data/identities/${encodeURIComponent(identityId)}`,
      install.instance_id
    );
    if (!isRecord(raw)) return null;
    return normalizeIdentity(raw);
  } catch (err) {
    if (isNotFoundError(err)) return null;
    throw err;
  }
}

async function queryIdentities(
  bearer: string,
  instanceId: string,
  filters: Record<string, string>,
  limit: number
): Promise<CustomerIdentity[]> {
  const pageSize = Math.min(Math.max(limit, 1), 100);
  const raw = await blnkDataGetJson(bearer, "/data/identities", instanceId, {
    ...filters,
    page: "1",
    pageSize: String(pageSize),
  });
  return parseIdentityList(raw, limit);
}

export async function searchIdentities(
  install: InstallRow,
  query: string,
  limit = 10
): Promise<CustomerIdentity[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("idt_")) {
    const identity = await getIdentityById(install, trimmed);
    return identity ? [identity] : [];
  }

  assertInstallPermission(install, "data:read");
  const bearer = decryptSecret(install.api_key_encrypted);
  const terms = trimmed.split(/\s+/).filter(Boolean);
  const cappedLimit = Math.min(Math.max(limit, 1), 50);

  if (terms.length >= 2) {
    const firstTerm = terms[0]!;
    const lastTerm = terms[terms.length - 1]!;
    return queryIdentities(
      bearer,
      install.instance_id,
      {
        first_name_ilike: `%${firstTerm}%`,
        last_name_ilike: `%${lastTerm}%`,
      },
      cappedLimit
    );
  }

  const term = terms[0]!;
  const pattern = `%${term}%`;
  const [byFirstName, byLastName] = await Promise.all([
    queryIdentities(
      bearer,
      install.instance_id,
      { first_name_ilike: pattern },
      cappedLimit
    ),
    queryIdentities(
      bearer,
      install.instance_id,
      { last_name_ilike: pattern },
      cappedLimit
    ),
  ]);

  return mergeIdentities([byFirstName, byLastName], cappedLimit);
}
