import type { Request, Response, NextFunction } from "express";
import {
  authenticatePortalToken,
  type PortalAuthOk,
} from "./portalAuth.js";

export type PortalAuthedRequest = Request & {
  portalAuth?: PortalAuthOk;
};

export function readPortalToken(req: Request): string | undefined {
  return typeof req.query.token === "string" ? req.query.token : undefined;
}

export function requirePortalAuth(
  req: PortalAuthedRequest,
  res: Response,
  next: NextFunction
): void {
  const auth = authenticatePortalToken(readPortalToken(req));
  if (!auth.ok) {
    res.status(auth.status).json({ ok: false, error: auth.message });
    return;
  }
  req.portalAuth = auth;
  next();
}
