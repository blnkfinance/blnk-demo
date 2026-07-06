import {
  findInstallById,
  findPortalSessionRow,
  getPortalSession,
  type InstallRow,
  type PortalSessionRow,
} from "../db/index.js";

export type PortalAuthOk = { ok: true; session: PortalSessionRow; install: InstallRow };

export type PortalAuthFail = {
  ok: false;
  status: 401 | 403 | 410;
  message: string;
};

export type PortalAuthResult = PortalAuthOk | PortalAuthFail;

export function authenticatePortalToken(token: string | null | undefined): PortalAuthResult {
  if (!token || typeof token !== "string" || !token.trim()) {
    return { ok: false, status: 401, message: "Missing token" };
  }

  const row = findPortalSessionRow(token);
  if (!row) {
    return { ok: false, status: 401, message: "Invalid session" };
  }

  if (row.expires_at_ms < Date.now()) {
    return { ok: false, status: 410, message: "Session expired" };
  }

  const session = getPortalSession(token);
  if (!session) {
    return { ok: false, status: 410, message: "Session expired" };
  }

  const install = findInstallById(session.installed_app_id);
  if (!install || install.status !== "active") {
    return { ok: false, status: 403, message: "Install no longer active" };
  }

  return { ok: true, session, install };
}
