import { getEnv } from "../env.js";
import type { InstallRow } from "../../db/index.js";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export function getOmniCloudApiOrigin(): string {
  return getEnv().blnkCloudApiOrigin;
}

export async function blnkDataGetJson(
  bearerToken: string,
  resourcePath: string,
  instanceId: string,
  query: Record<string, string> = {}
): Promise<unknown> {
  const origin = getOmniCloudApiOrigin();
  const u = new URL(`${origin}${resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`}`);
  u.searchParams.set("instance_id", instanceId);
  for (const [k, v] of Object.entries(query)) {
    u.searchParams.set(k, v);
  }

  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!res.ok) {
    throw new Error(`Omni Data GET ${resourcePath} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function blnkFilterPostJson(
  bearerToken: string,
  resourcePath: string,
  instanceId: string,
  body: Record<string, unknown>,
  query: Record<string, string> = {}
): Promise<unknown> {
  const origin = getOmniCloudApiOrigin();
  const u = new URL(`${origin}${resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`}`);
  u.searchParams.set("instance_id", instanceId);
  for (const [k, v] of Object.entries(query)) {
    u.searchParams.set(k, v);
  }

  const res = await fetch(u.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Omni Filter POST ${resourcePath} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function blnkProxyPostJson(
  bearerToken: string,
  resourcePath: string,
  instanceId: string,
  body: unknown
): Promise<unknown> {
  const origin = getOmniCloudApiOrigin();
  const u = new URL(`${origin}${resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`}`);
  u.searchParams.set("instance_id", instanceId);

  const res = await fetch(u.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Omni Proxy POST ${resourcePath} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function blnkProxyPutJson(
  bearerToken: string,
  resourcePath: string,
  instanceId: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const origin = getOmniCloudApiOrigin();
  const u = new URL(`${origin}${resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`}`);
  u.searchParams.set("instance_id", instanceId);

  const res = await fetch(u.toString(), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Omni Proxy PUT ${resourcePath} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export function blnkFirstListItemId(raw: unknown, idField: string): string | null {
  if (!isRecord(raw)) return null;
  const data = raw.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = data[0];
  if (!isRecord(row)) return null;
  const id = row[idField];
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function blnkRequireId(raw: unknown, idField: string): string {
  if (!isRecord(raw) || typeof raw[idField] !== "string" || raw[idField].length === 0) {
    throw new Error(`Omni response missing ${idField}`);
  }
  return raw[idField];
}

export function parseGrantedPermissions(install: InstallRow): string[] {
  try {
    const parsed: unknown = JSON.parse(install.granted_permissions);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === "string");
  } catch {
    return [];
  }
}

export function assertInstallPermission(install: InstallRow, permission: string): void {
  const granted = parseGrantedPermissions(install);
  if (!granted.includes(permission)) {
    throw new Error(`Install lacks required permission: ${permission}`);
  }
}
