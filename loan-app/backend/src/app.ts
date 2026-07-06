import express from "express";
import cors from "cors";
import { getDb } from "./db/index.js";
import { getEnv } from "./lib/env.js";
import { errorHandler } from "./lib/errorHandler.js";
import { requirePortalAuth } from "./lib/requirePortalAuth.js";
import { postCallback, postPortal } from "./routes/customApp.js";
import { verifyPortal } from "./routes/portalVerify.js";
import {
  archiveProduct,
  createProduct,
  getProduct,
  listProducts,
  patchProduct,
  unarchiveProduct,
} from "./routes/products.js";
import {
  approveLoan,
  createLoan,
  getLoan,
  listLoanLedgerTransactionsHandler,
  listLoansHandler,
  payScheduleLine,
  markScheduleLineDueHandler,
  rejectLoan,
  simulateInterestAccrual,
} from "./routes/loans.js";
import {
  checkIdentityLoanEligibilityHandler,
  searchIdentitiesHandler,
} from "./routes/identities.js";
import {
  getLoanLedgers,
  getBrandingSettingsHandler,
  getLoanEligibilitySettingsHandler,
  patchBrandingSettingsHandler,
  patchLoanEligibilitySettingsHandler,
  postEnsureLoanLedgers,
} from "./routes/settings.js";

function asyncRoute(
  handler: (req: express.Request, res: express.Response) => Promise<void>
): express.RequestHandler {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

export function createApp(): express.Express {
  getDb();

  const app = express();
  const { portalBaseUrl } = getEnv();

  app.use(
    cors({
      origin: portalBaseUrl,
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    })
  );
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post("/callback", postCallback);
  app.post("/portal", postPortal);
  app.get("/portal", asyncRoute(verifyPortal));

  app.get("/settings/ledgers", requirePortalAuth, getLoanLedgers);
  app.post(
    "/settings/ledgers/ensure",
    requirePortalAuth,
    asyncRoute(postEnsureLoanLedgers)
  );
  app.get(
    "/settings/loan-eligibility",
    requirePortalAuth,
    getLoanEligibilitySettingsHandler
  );
  app.patch(
    "/settings/loan-eligibility",
    requirePortalAuth,
    patchLoanEligibilitySettingsHandler
  );
  app.get("/settings/branding", requirePortalAuth, getBrandingSettingsHandler);
  app.patch(
    "/settings/branding",
    requirePortalAuth,
    patchBrandingSettingsHandler
  );

  app.get(
    "/identities/search",
    requirePortalAuth,
    asyncRoute(searchIdentitiesHandler)
  );
  app.get(
    "/identities/:identity_id/loan-eligibility",
    requirePortalAuth,
    asyncRoute(checkIdentityLoanEligibilityHandler)
  );

  app.get("/products", requirePortalAuth, listProducts);
  app.post("/products", requirePortalAuth, createProduct);
  app.get("/products/:loan_product_id", requirePortalAuth, getProduct);
  app.patch("/products/:loan_product_id", requirePortalAuth, patchProduct);
  app.post(
    "/products/:loan_product_id/archive",
    requirePortalAuth,
    archiveProduct
  );
  app.post(
    "/products/:loan_product_id/unarchive",
    requirePortalAuth,
    unarchiveProduct
  );

  // Loan applications: immutable deal terms after create.
  // Loan status changes via approve/reject; schedule lines track scheduled/due/paid/overdue/void status.
  app.get("/loans", requirePortalAuth, asyncRoute(listLoansHandler));
  app.post("/loans", requirePortalAuth, asyncRoute(createLoan));
  app.get("/loans/:loan_id", requirePortalAuth, asyncRoute(getLoan));
  app.get(
    "/loans/:loan_id/ledger-transactions",
    requirePortalAuth,
    asyncRoute(listLoanLedgerTransactionsHandler)
  );
  app.post("/loans/:loan_id/approve", requirePortalAuth, asyncRoute(approveLoan));
  app.post("/loans/:loan_id/reject", requirePortalAuth, asyncRoute(rejectLoan));
  app.post(
    "/loans/:loan_id/schedule/:loan_schedule_id/pay",
    requirePortalAuth,
    asyncRoute(payScheduleLine)
  );
  app.post(
    "/loans/:loan_id/schedule/:loan_schedule_id/mark-due",
    requirePortalAuth,
    asyncRoute(markScheduleLineDueHandler)
  );
  app.post(
    "/loans/:loan_id/schedule/:loan_schedule_id/simulate-interest",
    requirePortalAuth,
    asyncRoute(simulateInterestAccrual)
  );

  app.use(errorHandler);

  return app;
}
