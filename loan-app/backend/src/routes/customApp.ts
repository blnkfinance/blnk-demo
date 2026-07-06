import Database from "better-sqlite3";
import type { Request, Response } from "express";
import {
  createPortalSession,
  findInstallById,
  insertActiveInstall,
  markInstallInactive,
  recordWebhookProcessed,
  wasWebhookProcessed,
} from "../db/index.js";
import { encryptSecret } from "../lib/crypto.js";
import { getEnv } from "../lib/env.js";
import { logger, newRequestId } from "../lib/logger.js";
import { parseCallbackBody, PortalLaunchSchema } from "../lib/schemas/blnk.js";

function isSqliteConstraint(err: unknown): boolean {
  return (
    err instanceof Database.SqliteError &&
    typeof err.code === "string" &&
    err.code.startsWith("SQLITE_CONSTRAINT")
  );
}

export function postCallback(req: Request, res: Response): void {
  const requestId = newRequestId();
  const parsed = parseCallbackBody(req.body);

  if (parsed.kind === "unknown") {
    logger.warn("callback.unrecognized", { request_id: requestId });
    res.status(400).json({ error: "Unrecognized callback. Expected install or uninstall event payload." });
    return;
  }

  if (parsed.kind === "install") {
    const install = parsed.data;
    if (wasWebhookProcessed(install.idempotency_key)) {
      logger.info("callback.install.duplicate", {
        request_id: requestId,
        installed_app_id: install.installed_app_id,
        idempotency_key: install.idempotency_key,
      });
      res.status(200).json({ ok: true });
      return;
    }

    try {
      insertActiveInstall({
        installed_app_id: install.installed_app_id,
        app_id: install.app_id,
        instance_id: install.instance_id,
        api_key_encrypted: encryptSecret(install.api_key),
        api_key_prefix: install.api_key_prefix,
        granted_permissions: install.granted_permissions,
        status: "active",
        idempotency_key: install.idempotency_key,
      });
    } catch (err) {
      if (!isSqliteConstraint(err)) throw err;
    }

    recordWebhookProcessed(install.idempotency_key);
    logger.info("callback.install.ok", {
      request_id: requestId,
      installed_app_id: install.installed_app_id,
      api_key_prefix: install.api_key_prefix,
    });
    res.status(200).json({ ok: true });
    return;
  }

  const uninstall = parsed.data;
  if (wasWebhookProcessed(uninstall.idempotency_key)) {
    logger.info("callback.uninstall.duplicate", {
      request_id: requestId,
      installed_app_id: uninstall.installed_app_id,
      idempotency_key: uninstall.idempotency_key,
    });
    res.status(200).json({ ok: true });
    return;
  }

  markInstallInactive(uninstall.installed_app_id, uninstall.uninstalled_at);
  recordWebhookProcessed(uninstall.idempotency_key);
  logger.info("callback.uninstall.ok", {
    request_id: requestId,
    installed_app_id: uninstall.installed_app_id,
  });
  res.status(200).json({ ok: true });
}

export function postPortal(req: Request, res: Response): void {
  const requestId = newRequestId();
  const parsed = PortalLaunchSchema.safeParse(req.body);

  if (!parsed.success) {
    logger.warn("portal.launch.invalid", { request_id: requestId });
    res.status(400).json({
      error: "Invalid portal request. Required: installed_app_id, app_id, instance_id.",
    });
    return;
  }

  const body = parsed.data;
  const install = findInstallById(body.installed_app_id);

  if (
    !install ||
    install.status !== "active" ||
    install.app_id !== body.app_id ||
    install.instance_id !== body.instance_id
  ) {
    logger.warn("portal.launch.forbidden", {
      request_id: requestId,
      installed_app_id: body.installed_app_id,
    });
    res.status(403).json({ error: "This install is missing or inactive." });
    return;
  }

  const token = createPortalSession(body.installed_app_id);
  const { portalBaseUrl } = getEnv();
  const portal_url = `${portalBaseUrl}/portal?token=${encodeURIComponent(token)}`;

  logger.info("portal.launch.ok", {
    request_id: requestId,
    installed_app_id: body.installed_app_id,
  });
  res.status(200).json({ portal_url });
}
