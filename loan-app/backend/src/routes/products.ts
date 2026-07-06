import type { Response } from "express";
import {
  archiveLoanProduct,
  findLoanProductById,
  insertLoanProduct,
  listLoanProducts,
  unarchiveLoanProduct,
  updateLoanProduct,
} from "../db/index.js";
import {
  sendValidationError,
  zodValidationResponse,
} from "../lib/apiError.js";
import { logger, newRequestId } from "../lib/logger.js";
import {
  createLoanProductSchema,
  listProductsQuerySchema,
  updateLoanProductSchema,
} from "../lib/schemas/products.js";
import type { PortalAuthedRequest } from "../lib/requirePortalAuth.js";

export function listProducts(req: PortalAuthedRequest, res: Response): void {
  const requestId = newRequestId();
  const parsed = listProductsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, zodValidationResponse(parsed.error));
    return;
  }

  const { status, interest_type, limit, offset } = parsed.data;
  const result = listLoanProducts({ status, interest_type, limit, offset });

  logger.info("products.list.ok", {
    request_id: requestId,
    total: result.total,
    status,
  });

  res.status(200).json({
    products: result.products,
    total: result.total,
    limit,
    offset,
  });
}

export function getProduct(req: PortalAuthedRequest, res: Response): void {
  const requestId = newRequestId();
  const loanProductId = req.params.loan_product_id;

  const product = findLoanProductById(loanProductId);
  if (!product) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan product." });
    return;
  }

  logger.info("products.get.ok", {
    request_id: requestId,
    loan_product_id: loanProductId,
  });

  res.status(200).json({ product });
}

export function createProduct(req: PortalAuthedRequest, res: Response): void {
  const requestId = newRequestId();
  const parsed = createLoanProductSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, zodValidationResponse(parsed.error));
    return;
  }

  const input = parsed.data;
  const grace_period_days =
    input.grace_period_type === "none" ? null : (input.grace_period_days ?? null);

  const product = insertLoanProduct({
    name: input.name,
    interest_type: input.interest_type,
    annual_rate_bps: input.annual_rate_bps,
    day_count_convention: input.day_count_convention,
    payment_frequency: input.payment_frequency,
    amortization_type: input.amortization_type,
    grace_period_type: input.grace_period_type,
    grace_period_days,
  });

  logger.info("products.create.ok", {
    request_id: requestId,
    loan_product_id: product.loan_product_id,
  });

  res.status(201).json({ product });
}

export function patchProduct(req: PortalAuthedRequest, res: Response): void {
  const requestId = newRequestId();
  const loanProductId = req.params.loan_product_id;

  const parsed = updateLoanProductSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, zodValidationResponse(parsed.error));
    return;
  }

  const existing = findLoanProductById(loanProductId);
  if (!existing) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan product." });
    return;
  }

  if (existing.status === "archived") {
    res
      .status(409)
      .json({ ok: false, error: "Archived products can't be edited." });
    return;
  }

  const product = updateLoanProduct(loanProductId, parsed.data);
  if (!product) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan product." });
    return;
  }

  logger.info("products.patch.ok", {
    request_id: requestId,
    loan_product_id: loanProductId,
  });

  res.status(200).json({ product });
}

export function archiveProduct(req: PortalAuthedRequest, res: Response): void {
  const requestId = newRequestId();
  const loanProductId = req.params.loan_product_id;

  const product = archiveLoanProduct(loanProductId);
  if (!product) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan product." });
    return;
  }

  logger.info("products.archive.ok", {
    request_id: requestId,
    loan_product_id: loanProductId,
  });

  res.status(200).json({ product });
}

export function unarchiveProduct(req: PortalAuthedRequest, res: Response): void {
  const requestId = newRequestId();
  const loanProductId = req.params.loan_product_id;

  const product = unarchiveLoanProduct(loanProductId);
  if (!product) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan product." });
    return;
  }

  logger.info("products.unarchive.ok", {
    request_id: requestId,
    loan_product_id: loanProductId,
  });

  res.status(200).json({ product });
}
