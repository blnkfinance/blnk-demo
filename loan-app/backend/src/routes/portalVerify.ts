import type { Request, Response } from "express";
import { authenticatePortalToken } from "../lib/portalAuth.js";
import { buildFrameAncestorsCsp } from "../lib/frameAncestorsCsp.js";
import { resolveBrandingPrimaryColor } from "../lib/branding.js";
import { getBrandingSettings } from "../db/index.js";
import { ensureLoanLedgers } from "../lib/blnk/loanLedgers.js";
import { getEnv } from "../lib/env.js";
import { logger, newRequestId } from "../lib/logger.js";

const CSP = buildFrameAncestorsCsp();

export async function verifyPortal(req: Request, res: Response): Promise<void> {
  const requestId = newRequestId();
  const token = typeof req.query.token === "string" ? req.query.token : undefined;

  const auth = authenticatePortalToken(token);
  res.setHeader("Content-Security-Policy", CSP);

  if (!auth.ok) {
    logger.warn("portal.verify.denied", {
      request_id: requestId,
      status: auth.status,
    });
    res.status(auth.status).json({ ok: false, error: auth.message });
    return;
  }

  void ensureLoanLedgers(auth.install)
    .then((rows) => {
      for (const row of rows) {
        logger.info("portal.verify.ledger_setup.ok", {
          request_id: requestId,
          instance_id: auth.install.instance_id,
          ledger_key: row.ledger_key,
        });
      }
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : "Ledger setup failed";
      logger.warn("portal.verify.ledger_setup.error", {
        request_id: requestId,
        installed_app_id: auth.install.installed_app_id,
        error: message,
      });
    });

  logger.info("portal.verify.ok", {
    request_id: requestId,
    installed_app_id: auth.install.installed_app_id,
  });
  const branding = getBrandingSettings(auth.install.installed_app_id);
  res.status(200).json({
    ok: true,
    installed_app_id: auth.install.installed_app_id,
    instance_id: auth.install.instance_id,
    blnk_cloud_api_origin: getEnv().blnkCloudApiOrigin,
    branding_primary_color: resolveBrandingPrimaryColor(branding.primary_color),
  });
}
