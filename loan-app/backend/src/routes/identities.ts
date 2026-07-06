import type { Response } from "express";
import { searchIdentities } from "../lib/blnk/identities.js";
import { checkIdentityLoanEligibility } from "../lib/blnk/loanEligibility.js";
import { logger, newRequestId } from "../lib/logger.js";
import type { PortalAuthedRequest } from "../lib/requirePortalAuth.js";
import { z } from "zod";

const searchIdentitiesQuerySchema = z.object({
  q: z.string().trim().default(""),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function searchIdentitiesHandler(
  req: PortalAuthedRequest,
  res: Response
): Promise<void> {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const parsed = searchIdentitiesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Invalid search parameters." });
    return;
  }

  const { q, limit } = parsed.data;

  try {
    const identities = await searchIdentities(install, q, limit);
    logger.info("identities.search.ok", {
      request_id: requestId,
      installed_app_id: install.installed_app_id,
      count: identities.length,
    });
    res.status(200).json({ identities });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to search identities";
    logger.warn("identities.search.error", {
      request_id: requestId,
      installed_app_id: install.installed_app_id,
      error: message,
    });
    res.status(502).json({ ok: false, error: message });
  }
}

export async function checkIdentityLoanEligibilityHandler(
  req: PortalAuthedRequest,
  res: Response
): Promise<void> {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const identityId = req.params.identity_id?.trim();

  if (!identityId) {
    res.status(400).json({ ok: false, error: "Identity ID is required." });
    return;
  }

  try {
    const result = await checkIdentityLoanEligibility(install, identityId);
    logger.info("identities.loan_eligibility.ok", {
      request_id: requestId,
      installed_app_id: install.installed_app_id,
      identity_id: identityId,
      eligible: result.eligible,
    });
    res.status(200).json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to check loan eligibility";
    logger.warn("identities.loan_eligibility.error", {
      request_id: requestId,
      installed_app_id: install.installed_app_id,
      identity_id: identityId,
      error: message,
    });
    res.status(502).json({ ok: false, error: message });
  }
}
