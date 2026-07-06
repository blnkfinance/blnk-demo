import type { Response } from "express";
import {
  ensureLoanLedgers,
  listLoanLedgersForSettings,
  toLoanLedgerResponse,
} from "../lib/blnk/loanLedgers.js";
import { logger, newRequestId } from "../lib/logger.js";
import type { PortalAuthedRequest } from "../lib/requirePortalAuth.js";
import {
  ALL_LOAN_BOOK_TYPES,
  getBrandingSettings,
  getLoanEligibilitySettings,
  upsertBrandingSettings,
  upsertLoanEligibilitySettings,
  type LoanBookType,
} from "../db/index.js";
import { sendValidationError, zodValidationResponse } from "../lib/apiError.js";
import { isValidBrandingPrimaryColor, resolveBrandingPrimaryColor } from "../lib/branding.js";
import { z } from "zod";

const loanBookTypeSchema = z.enum(["a_book", "b_book", "justo"]);

const patchLoanEligibilitySchema = z.object({
  allowed_books: z
    .array(loanBookTypeSchema)
    .min(1, "At least one book type must be enabled."),
});

const patchBrandingSchema = z.object({
  primary_color: z
    .string()
    .trim()
    .refine(isValidBrandingPrimaryColor, "Primary colour must be a valid hex code."),
});

export function getLoanLedgers(req: PortalAuthedRequest, res: Response): void {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;

  const ledgers = listLoanLedgersForSettings(install.installed_app_id);

  logger.info("settings.ledgers.get.ok", {
    request_id: requestId,
    installed_app_id: install.installed_app_id,
    count: ledgers.length,
  });

  res.status(200).json({ ledgers });
}

export async function postEnsureLoanLedgers(
  req: PortalAuthedRequest,
  res: Response
): Promise<void> {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;

  try {
    const rows = await ensureLoanLedgers(install);
    logger.info("settings.ledgers.ensure.ok", {
      request_id: requestId,
      installed_app_id: install.installed_app_id,
      count: rows.length,
    });
    res.status(200).json({
      ledgers: rows.map(toLoanLedgerResponse),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to ensure ledgers";
    logger.warn("settings.ledgers.ensure.error", {
      request_id: requestId,
      installed_app_id: install.installed_app_id,
      error: message,
    });
    res.status(502).json({ ok: false, error: message });
  }
}

export function getLoanEligibilitySettingsHandler(
  req: PortalAuthedRequest,
  res: Response
): void {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const settings = getLoanEligibilitySettings(install.installed_app_id);

  logger.info("settings.loan_eligibility.get.ok", {
    request_id: requestId,
    installed_app_id: install.installed_app_id,
    count: settings.allowed_books.length,
  });

  res.status(200).json({ allowed_books: settings.allowed_books });
}

export function patchLoanEligibilitySettingsHandler(
  req: PortalAuthedRequest,
  res: Response
): void {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const parsed = patchLoanEligibilitySchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidationError(res, zodValidationResponse(parsed.error));
    return;
  }

  const allowed_books = [...new Set(parsed.data.allowed_books)] as LoanBookType[];
  const invalid = allowed_books.filter(
    (book) => !ALL_LOAN_BOOK_TYPES.includes(book)
  );
  if (invalid.length > 0) {
    res.status(400).json({ ok: false, error: "Invalid book type." });
    return;
  }

  const settings = upsertLoanEligibilitySettings({
    installed_app_id: install.installed_app_id,
    allowed_books,
  });

  logger.info("settings.loan_eligibility.patch.ok", {
    request_id: requestId,
    installed_app_id: install.installed_app_id,
    count: settings.allowed_books.length,
  });

  res.status(200).json({ allowed_books: settings.allowed_books });
}

export function getBrandingSettingsHandler(
  req: PortalAuthedRequest,
  res: Response
): void {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const settings = getBrandingSettings(install.installed_app_id);

  logger.info("settings.branding.get.ok", {
    request_id: requestId,
    installed_app_id: install.installed_app_id,
  });

  res.status(200).json({
    primary_color: resolveBrandingPrimaryColor(settings.primary_color),
  });
}

export function patchBrandingSettingsHandler(
  req: PortalAuthedRequest,
  res: Response
): void {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const parsed = patchBrandingSchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidationError(res, zodValidationResponse(parsed.error));
    return;
  }

  const primary_color = resolveBrandingPrimaryColor(parsed.data.primary_color);
  const settings = upsertBrandingSettings({
    installed_app_id: install.installed_app_id,
    primary_color,
  });

  logger.info("settings.branding.patch.ok", {
    request_id: requestId,
    installed_app_id: install.installed_app_id,
  });

  res.status(200).json({ primary_color: settings.primary_color });
}
