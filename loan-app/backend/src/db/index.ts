import Database from "better-sqlite3";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { getEnv } from "../lib/env.js";
import { DEFAULT_BRANDING_PRIMARY_COLOR } from "../lib/branding.js";
import { toIsoUtcNoMs, tryToIsoUtcNoMsFromString } from "../lib/isoTime.js";

export type InstallRow = {
  installed_app_id: string;
  app_id: string;
  instance_id: string;
  api_key_encrypted: string;
  api_key_prefix: string;
  granted_permissions: string;
  status: "active" | "inactive";
  idempotency_key: string | null;
  installed_at: string | null;
  uninstalled_at: string | null;
};

export type PortalSessionRow = {
  token: string;
  installed_app_id: string;
  expires_at_ms: number;
  created_at: string;
  expires_at: string;
};

export type LoanProductStatus = "active" | "archived";

export type LoanProductRow = {
  loan_product_id: string;
  name: string;
  interest_type: "fixed";
  annual_rate_bps: number;
  day_count_convention: "actual_360" | "actual_365" | "30_360";
  payment_frequency: "weekly" | "biweekly" | "monthly";
  amortization_type: "equal_installments" | "equal_principal" | "bullet";
  grace_period_type: "none" | "interest_only" | "full";
  grace_period_days: number | null;
  status: LoanProductStatus;
  created_at: string;
  updated_at: string;
};

export type InsertLoanProductInput = {
  name: string;
  interest_type: "fixed";
  annual_rate_bps: number;
  day_count_convention: LoanProductRow["day_count_convention"];
  payment_frequency: LoanProductRow["payment_frequency"];
  amortization_type: LoanProductRow["amortization_type"];
  grace_period_type: LoanProductRow["grace_period_type"];
  grace_period_days: number | null;
};

export type UpdateLoanProductInput = Partial<InsertLoanProductInput>;

export type LoanLedgerKey = "loans_receivable" | "accrued_interest" | "deferred_fee";

export type LoanLedgerRow = {
  installed_app_id: string;
  instance_id: string;
  ledger_key: LoanLedgerKey;
  name: string;
  blnk_ledger_id: string;
  created_at: string;
  updated_at: string;
};

export type UpsertLoanLedgerInput = {
  installed_app_id: string;
  instance_id: string;
  ledger_key: LoanLedgerKey;
  name: string;
  blnk_ledger_id: string;
};

export type LoanBookType = "a_book" | "b_book" | "justo";

export const ALL_LOAN_BOOK_TYPES: readonly LoanBookType[] = [
  "a_book",
  "b_book",
  "justo",
] as const;

export const DEFAULT_ALLOWED_LOAN_BOOKS: LoanBookType[] = ["a_book"];

export type LoanEligibilitySettingsRow = {
  installed_app_id: string;
  allowed_books: LoanBookType[];
  updated_at: string;
};

export type UpsertLoanEligibilitySettingsInput = {
  installed_app_id: string;
  allowed_books: LoanBookType[];
};

export type BrandingSettingsRow = {
  installed_app_id: string;
  primary_color: string;
  updated_at: string;
};

export type UpsertBrandingSettingsInput = {
  installed_app_id: string;
  primary_color: string;
};

export type ListLoanProductsFilters = {
  status?: LoanProductStatus;
  interest_type?: "fixed";
  limit: number;
  offset: number;
};

const DEFAULT_PORTAL_TTL_MS = 30 * 60 * 1000;

const DEV_PORTAL_TOKEN = "dev";
const DEV_INSTALLED_APP_ID = "dev_installed_app_id";
const DEV_INSTANCE_ID = "dev_instance_id";
const DEV_SESSION_EXPIRES_AT_MS = Date.UTC(2100, 0, 1, 0, 0, 0, 0);

let db: Database.Database | null = null;

function seedDevInstallAndSession(database: Database.Database): void {
  const nowIso = toIsoUtcNoMs(new Date());
  const expiresIso = toIsoUtcNoMs(new Date(DEV_SESSION_EXPIRES_AT_MS));
  database
    .prepare(
      `INSERT OR IGNORE INTO installs (
        installed_app_id, app_id, instance_id,
        api_key_encrypted, api_key_prefix, granted_permissions,
        status, idempotency_key, installed_at, uninstalled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`
    )
    .run(
      DEV_INSTALLED_APP_ID,
      "dev_app_id",
      DEV_INSTANCE_ID,
      "dev_encrypted_placeholder",
      "dev_prefix",
      "[]",
      "active",
      nowIso
    );
  database
    .prepare(
      `INSERT OR IGNORE INTO portal_sessions (
        token, installed_app_id, expires_at_ms, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?)`
    )
    .run(DEV_PORTAL_TOKEN, DEV_INSTALLED_APP_ID, DEV_SESSION_EXPIRES_AT_MS, nowIso, expiresIso);
}

const LOAN_PRODUCT_COLUMNS = `
  loan_product_id, name, interest_type, annual_rate_bps,
  day_count_convention, payment_frequency, amortization_type,
  grace_period_type, grace_period_days, status, created_at, updated_at
`;

function seedDevLoanProducts(database: Database.Database): void {
  const nowIso = toIsoUtcNoMs(new Date());
  const insert = database.prepare(
    `INSERT OR IGNORE INTO loan_products (
      loan_product_id, name, interest_type, annual_rate_bps,
      day_count_convention, payment_frequency, amortization_type,
      grace_period_type, grace_period_days, status, created_at, updated_at
    ) VALUES (
      @loan_product_id, @name, @interest_type, @annual_rate_bps,
      @day_count_convention, @payment_frequency, @amortization_type,
      @grace_period_type, @grace_period_days, @status, @created_at, @updated_at
    )`
  );

  const seeds: Omit<LoanProductRow, "created_at" | "updated_at">[] = [
    {
      loan_product_id: "prd_dev_personal_loan",
      name: "Personal Loan",
      interest_type: "fixed",
      annual_rate_bps: 2400,
      day_count_convention: "actual_360",
      payment_frequency: "monthly",
      amortization_type: "equal_installments",
      grace_period_type: "none",
      grace_period_days: null,
      status: "active",
    },
    {
      loan_product_id: "prd_dev_auto_loan",
      name: "Auto Loan",
      interest_type: "fixed",
      annual_rate_bps: 1800,
      day_count_convention: "actual_365",
      payment_frequency: "monthly",
      amortization_type: "equal_principal",
      grace_period_type: "none",
      grace_period_days: null,
      status: "active",
    },
    {
      loan_product_id: "prd_dev_bridge_credit",
      name: "Bridge Credit",
      interest_type: "fixed",
      annual_rate_bps: 3000,
      day_count_convention: "actual_360",
      payment_frequency: "monthly",
      amortization_type: "bullet",
      grace_period_type: "none",
      grace_period_days: null,
      status: "archived",
    },
  ];

  for (const seed of seeds) {
    insert.run({ ...seed, created_at: nowIso, updated_at: nowIso });
  }
}

export function getDb(): Database.Database {
  if (db) return db;

  const { sqliteDbPath, nodeEnv } = getEnv();
  mkdirSync(path.dirname(sqliteDbPath), { recursive: true });
  db = new Database(sqliteDbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS installs (
      installed_app_id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      instance_id TEXT NOT NULL,
      api_key_encrypted TEXT NOT NULL,
      api_key_prefix TEXT NOT NULL,
      granted_permissions TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
      idempotency_key TEXT UNIQUE,
      installed_at TEXT,
      uninstalled_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_installs_status ON installs(status);

    CREATE TABLE IF NOT EXISTS portal_sessions (
      token TEXT PRIMARY KEY,
      installed_app_id TEXT NOT NULL,
      expires_at_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(installed_app_id) REFERENCES installs(installed_app_id)
    );
    CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires_at_ms ON portal_sessions(expires_at_ms);
    CREATE INDEX IF NOT EXISTS idx_portal_sessions_installed_app_id ON portal_sessions(installed_app_id);

    CREATE TABLE IF NOT EXISTS webhook_events (
      idempotency_key TEXT PRIMARY KEY,
      received_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS loan_products (
      loan_product_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      interest_type TEXT NOT NULL CHECK (interest_type IN ('fixed')),
      annual_rate_bps INTEGER NOT NULL,
      day_count_convention TEXT NOT NULL CHECK (
        day_count_convention IN ('actual_360', 'actual_365', '30_360')
      ),
      payment_frequency TEXT NOT NULL CHECK (
        payment_frequency IN ('weekly', 'biweekly', 'monthly')
      ),
      amortization_type TEXT NOT NULL CHECK (
        amortization_type IN ('equal_installments', 'equal_principal', 'bullet')
      ),
      grace_period_type TEXT NOT NULL CHECK (
        grace_period_type IN ('none', 'interest_only', 'full')
      ),
      grace_period_days INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_loan_products_status ON loan_products(status);

    CREATE TABLE IF NOT EXISTS loan_ledgers (
      installed_app_id TEXT NOT NULL,
      instance_id TEXT NOT NULL,
      ledger_key TEXT NOT NULL CHECK (
        ledger_key IN ('loans_receivable', 'accrued_interest', 'deferred_fee')
      ),
      name TEXT NOT NULL,
      blnk_ledger_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (installed_app_id, ledger_key),
      FOREIGN KEY (installed_app_id) REFERENCES installs(installed_app_id)
    );

    CREATE TABLE IF NOT EXISTS loan_eligibility_settings (
      installed_app_id TEXT PRIMARY KEY,
      allowed_books TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (installed_app_id) REFERENCES installs(installed_app_id)
    );

    CREATE TABLE IF NOT EXISTS branding_settings (
      installed_app_id TEXT PRIMARY KEY,
      primary_color TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (installed_app_id) REFERENCES installs(installed_app_id)
    );

    -- Loans: immutable deal terms + product snapshot at creation.
    -- Only status/decided_at/decision_note change via approve/reject.
    CREATE TABLE IF NOT EXISTS loans (
      loan_id TEXT PRIMARY KEY,
      installed_app_id TEXT NOT NULL REFERENCES installs(installed_app_id),
      blnk_identity_id TEXT,
      loan_product_id TEXT NOT NULL REFERENCES loan_products(loan_product_id),
      principal INTEGER NOT NULL,
      origination_fee INTEGER NOT NULL,
      net_disbursement INTEGER NOT NULL,
      term_periods INTEGER NOT NULL,
      first_payment_date TEXT NOT NULL,
      maturity_date TEXT NOT NULL,
      annual_rate_bps INTEGER NOT NULL,
      effective_annual_rate_bps INTEGER NOT NULL,
      day_count_convention TEXT NOT NULL CHECK (
        day_count_convention IN ('actual_360', 'actual_365', '30_360')
      ),
      payment_frequency TEXT NOT NULL CHECK (
        payment_frequency IN ('weekly', 'biweekly', 'monthly')
      ),
      amortization_type TEXT NOT NULL CHECK (
        amortization_type IN ('equal_installments', 'equal_principal', 'bullet')
      ),
      grace_period_type TEXT NOT NULL CHECK (
        grace_period_type IN ('none', 'interest_only', 'full')
      ),
      grace_period_days INTEGER,
      status TEXT NOT NULL CHECK (
        status IN ('pending_approval', 'approved', 'rejected')
      ),
      created_at TEXT NOT NULL,
      decided_at TEXT,
      decision_note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
    CREATE INDEX IF NOT EXISTS idx_loans_installed_app_id ON loans(installed_app_id);
    CREATE INDEX IF NOT EXISTS idx_loans_install_status ON loans(installed_app_id, status);
    CREATE INDEX IF NOT EXISTS idx_loans_loan_product_id ON loans(loan_product_id);
    CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at);

    -- One row per installment. Amounts are indicative at create; finalized on approve via UPDATE.
    -- After approval only status may change (e.g. paid). Holds contractual + EIR columns.
    CREATE TABLE IF NOT EXISTS loan_schedule (
      loan_schedule_id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL REFERENCES loans(loan_id),
      period INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      principal INTEGER NOT NULL,
      interest INTEGER NOT NULL,
      expected_payment INTEGER NOT NULL,
      closing_principal INTEGER NOT NULL,
      carrying_amount INTEGER NOT NULL,
      eir_interest INTEGER NOT NULL,
      fee_income INTEGER NOT NULL,
      interest_blnk_transaction TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'due', 'paid', 'overdue', 'void')),
      UNIQUE (loan_id, period)
    );
    CREATE INDEX IF NOT EXISTS idx_loan_schedule_loan_id ON loan_schedule(loan_id);
    CREATE INDEX IF NOT EXISTS idx_loan_schedule_payment_date ON loan_schedule(payment_date);
  `);

  if (nodeEnv === "development") {
    seedDevInstallAndSession(db);
    seedDevLoanProducts(db);
  }

  migrateLoanScheduleStatusColumn(db);
  migrateLoanScheduleStatusEnum(db);
  migrateLoanScheduleInterestBlnkTransaction(db);
  migrateLoanScheduleDueStatus(db);
  migrateLoansInstallScope(db);
  migrateLoanLedgersInstanceId(db);
  migrateLoansDisbursementDate(db);
  migrateLoansBlnkTransaction(db);
  migrateLoanRepayments(db);
  migrateLoanRepaymentsDropBlnkTransaction(db);

  return db;
}

function migrateLoanRepayments(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS loan_repayments (
      loan_repayment_id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      loan_schedule_id TEXT NOT NULL,
      total_amount_paid INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (loan_id) REFERENCES loans(loan_id),
      UNIQUE (loan_schedule_id)
    );
    CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
  `);
}

function migrateLoanRepaymentsDropBlnkTransaction(database: Database.Database): void {
  const columns = database
    .prepare(`PRAGMA table_info(loan_repayments)`)
    .all() as { name: string }[];

  if (!columns.some((column) => column.name === "blnk_transaction")) {
    return;
  }

  database.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN IMMEDIATE;

    CREATE TABLE loan_repayments_migrated (
      loan_repayment_id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      loan_schedule_id TEXT NOT NULL,
      total_amount_paid INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (loan_id) REFERENCES loans(loan_id),
      UNIQUE (loan_schedule_id)
    );

    INSERT INTO loan_repayments_migrated (
      loan_repayment_id, loan_id, loan_schedule_id, total_amount_paid, created_at
    )
    SELECT loan_repayment_id, loan_id, loan_schedule_id, total_amount_paid, created_at
    FROM loan_repayments;

    DROP TABLE loan_repayments;
    ALTER TABLE loan_repayments_migrated RENAME TO loan_repayments;

    CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);

    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

function migrateLoanScheduleStatusColumn(database: Database.Database): void {
  const columns = database
    .prepare(`PRAGMA table_info(loan_schedule)`)
    .all() as { name: string }[];

  if (columns.some((column) => column.name === "status")) {
    return;
  }

  database.exec(`
    ALTER TABLE loan_schedule
    ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'due', 'paid', 'overdue', 'void'));
  `);
}

function migrateLoanScheduleStatusEnum(database: Database.Database): void {
  const tableSql = database
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'loan_schedule'`
    )
    .get() as { sql: string } | undefined;

  if (!tableSql?.sql.includes("'unpaid'")) {
    return;
  }

  database.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN IMMEDIATE;

    CREATE TABLE loan_schedule_migrated (
      loan_schedule_id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL REFERENCES loans(loan_id),
      period INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      principal INTEGER NOT NULL,
      interest INTEGER NOT NULL,
      expected_payment INTEGER NOT NULL,
      closing_principal INTEGER NOT NULL,
      carrying_amount INTEGER NOT NULL,
      eir_interest INTEGER NOT NULL,
      fee_income INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'due', 'paid', 'overdue', 'void')),
      UNIQUE (loan_id, period)
    );

    INSERT INTO loan_schedule_migrated (
      loan_schedule_id, loan_id, period, payment_date,
      principal, interest, expected_payment, closing_principal,
      carrying_amount, eir_interest, fee_income, status
    )
    SELECT
      loan_schedule_id, loan_id, period, payment_date,
      principal, interest, expected_payment, closing_principal,
      carrying_amount, eir_interest, fee_income,
      CASE status WHEN 'unpaid' THEN 'scheduled' ELSE status END
    FROM loan_schedule;

    DROP TABLE loan_schedule;
    ALTER TABLE loan_schedule_migrated RENAME TO loan_schedule;

    CREATE INDEX IF NOT EXISTS idx_loan_schedule_loan_id ON loan_schedule(loan_id);
    CREATE INDEX IF NOT EXISTS idx_loan_schedule_payment_date ON loan_schedule(payment_date);

    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

function migrateLoanScheduleDueStatus(database: Database.Database): void {
  const tableSql = database
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'loan_schedule'`
    )
    .get() as { sql: string } | undefined;

  if (!tableSql?.sql || tableSql.sql.includes("'due'")) {
    return;
  }

  database.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN IMMEDIATE;

    CREATE TABLE loan_schedule_due_migrated (
      loan_schedule_id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL REFERENCES loans(loan_id),
      period INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      principal INTEGER NOT NULL,
      interest INTEGER NOT NULL,
      expected_payment INTEGER NOT NULL,
      closing_principal INTEGER NOT NULL,
      carrying_amount INTEGER NOT NULL,
      eir_interest INTEGER NOT NULL,
      fee_income INTEGER NOT NULL,
      interest_blnk_transaction TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'due', 'paid', 'overdue', 'void')),
      UNIQUE (loan_id, period)
    );

    INSERT INTO loan_schedule_due_migrated (
      loan_schedule_id, loan_id, period, payment_date,
      principal, interest, expected_payment, closing_principal,
      carrying_amount, eir_interest, fee_income, interest_blnk_transaction, status
    )
    SELECT
      loan_schedule_id, loan_id, period, payment_date,
      principal, interest, expected_payment, closing_principal,
      carrying_amount, eir_interest, fee_income, interest_blnk_transaction, status
    FROM loan_schedule;

    DROP TABLE loan_schedule;
    ALTER TABLE loan_schedule_due_migrated RENAME TO loan_schedule;

    CREATE INDEX IF NOT EXISTS idx_loan_schedule_loan_id ON loan_schedule(loan_id);
    CREATE INDEX IF NOT EXISTS idx_loan_schedule_payment_date ON loan_schedule(payment_date);

    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

function migrateLoanScheduleInterestBlnkTransaction(
  database: Database.Database
): void {
  const columns = database
    .prepare(`PRAGMA table_info(loan_schedule)`)
    .all() as { name: string }[];

  if (!columns.some((column) => column.name === "interest_blnk_transaction")) {
    database.exec(
      `ALTER TABLE loan_schedule ADD COLUMN interest_blnk_transaction TEXT`
    );
  }
}

function migrateLoansInstallScope(database: Database.Database): void {
  const columns = database
    .prepare(`PRAGMA table_info(loans)`)
    .all() as { name: string }[];

  if (!columns.some((column) => column.name === "installed_app_id")) {
    database.exec(`
      ALTER TABLE loans
      ADD COLUMN installed_app_id TEXT REFERENCES installs(installed_app_id);
    `);

    const fallbackInstall = database
      .prepare(
        `SELECT installed_app_id FROM installs WHERE status = 'active' ORDER BY installed_at ASC LIMIT 1`
      )
      .get() as { installed_app_id: string } | undefined;

    if (fallbackInstall) {
      database
        .prepare(`UPDATE loans SET installed_app_id = ? WHERE installed_app_id IS NULL`)
        .run(fallbackInstall.installed_app_id);
    }
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_loans_installed_app_id ON loans(installed_app_id);
    CREATE INDEX IF NOT EXISTS idx_loans_install_status ON loans(installed_app_id, status);
  `);
}

function migrateLoansDisbursementDate(database: Database.Database): void {
  const columns = database
    .prepare(`PRAGMA table_info(loans)`)
    .all() as { name: string }[];

  if (!columns.some((column) => column.name === "disbursement_date")) {
    database.exec(`ALTER TABLE loans ADD COLUMN disbursement_date TEXT`);
  }

  database.exec(`
    UPDATE loans
    SET disbursement_date = substr(decided_at, 1, 10)
    WHERE disbursement_date IS NULL
      AND decided_at IS NOT NULL
      AND status = 'approved'
  `);
}

function migrateLoansBlnkTransaction(database: Database.Database): void {
  const columns = database
    .prepare(`PRAGMA table_info(loans)`)
    .all() as { name: string }[];

  if (!columns.some((column) => column.name === "blnk_transaction")) {
    database.exec(`ALTER TABLE loans ADD COLUMN blnk_transaction TEXT`);
  }
}

function migrateLoanLedgersInstanceId(database: Database.Database): void {
  const columns = database
    .prepare(`PRAGMA table_info(loan_ledgers)`)
    .all() as { name: string }[];

  if (!columns.some((column) => column.name === "instance_id")) {
    database.exec(`ALTER TABLE loan_ledgers ADD COLUMN instance_id TEXT`);
  }

  database.exec(`
    UPDATE loan_ledgers
    SET instance_id = (
      SELECT instance_id
      FROM installs
      WHERE installs.installed_app_id = loan_ledgers.installed_app_id
    )
    WHERE instance_id IS NULL OR instance_id = ''
  `);
}

export function findInstallById(installedAppId: string): InstallRow | undefined {
  return getDb()
    .prepare(
      `SELECT installed_app_id, app_id, instance_id, api_key_encrypted, api_key_prefix,
              granted_permissions, status, idempotency_key, installed_at, uninstalled_at
       FROM installs WHERE installed_app_id = ?`
    )
    .get(installedAppId) as InstallRow | undefined;
}

export function wasWebhookProcessed(idempotencyKey: string): boolean {
  const row = getDb()
    .prepare(`SELECT 1 FROM webhook_events WHERE idempotency_key = ? LIMIT 1`)
    .get(idempotencyKey) as { 1: number } | undefined;
  return row !== undefined;
}

export function recordWebhookProcessed(idempotencyKey: string): void {
  const receivedAt = toIsoUtcNoMs(new Date());
  getDb()
    .prepare(`INSERT OR IGNORE INTO webhook_events (idempotency_key, received_at) VALUES (?, ?)`)
    .run(idempotencyKey, receivedAt);
}

export function insertActiveInstall(input: {
  installed_app_id: string;
  app_id: string;
  instance_id: string;
  api_key_encrypted: string;
  api_key_prefix: string;
  granted_permissions: string[];
  status: "active";
  idempotency_key: string;
}): void {
  const installedAt = toIsoUtcNoMs(new Date());
  getDb()
    .prepare(
      `INSERT INTO installs (
        installed_app_id, app_id, instance_id, api_key_encrypted, api_key_prefix,
        granted_permissions, status, idempotency_key, installed_at, uninstalled_at
      ) VALUES (@installed_app_id, @app_id, @instance_id, @api_key_encrypted, @api_key_prefix,
                @granted_permissions, @status, @idempotency_key, @installed_at, NULL)`
    )
    .run({
      ...input,
      granted_permissions: JSON.stringify(input.granted_permissions),
      installed_at: installedAt,
    });
}

export function deletePortalSessionsForInstall(installedAppId: string): void {
  getDb()
    .prepare(`DELETE FROM portal_sessions WHERE installed_app_id = ?`)
    .run(installedAppId);
}

export function markInstallInactive(installedAppId: string, uninstalledAt?: string): void {
  const database = getDb();
  let ts: string;
  if (typeof uninstalledAt === "string" && uninstalledAt.length > 0) {
    ts = tryToIsoUtcNoMsFromString(uninstalledAt) ?? uninstalledAt;
  } else {
    ts = toIsoUtcNoMs(new Date());
  }
  const tx = database.transaction(() => {
    database
      .prepare(
        `UPDATE installs SET status = 'inactive', uninstalled_at = ? WHERE installed_app_id = ?`
      )
      .run(ts, installedAppId);
    deletePortalSessionsForInstall(installedAppId);
  });
  tx();
}

export function createPortalSession(installedAppId: string, ttlMs = DEFAULT_PORTAL_TTL_MS): string {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expires_at_ms = now + ttlMs;
  const created_at = toIsoUtcNoMs(new Date(now));
  const expires_at = toIsoUtcNoMs(new Date(expires_at_ms));
  getDb()
    .prepare(
      `INSERT INTO portal_sessions (token, installed_app_id, expires_at_ms, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(token, installedAppId, expires_at_ms, created_at, expires_at);
  return token;
}

/** Returns session row regardless of expiry (for distinguishing 401 vs 410). */
export function findPortalSessionRow(token: string): PortalSessionRow | undefined {
  return getDb()
    .prepare(
      `SELECT token, installed_app_id, expires_at_ms, created_at, expires_at
       FROM portal_sessions WHERE token = ?`
    )
    .get(token) as PortalSessionRow | undefined;
}

export function getPortalSession(token: string): PortalSessionRow | undefined {
  const row = findPortalSessionRow(token);
  if (!row) return undefined;
  if (row.expires_at_ms < Date.now()) return undefined;
  return row;
}

function mapLoanProductRow(row: Record<string, unknown>): LoanProductRow {
  return {
    loan_product_id: String(row.loan_product_id),
    name: String(row.name),
    interest_type: "fixed",
    annual_rate_bps: Number(row.annual_rate_bps),
    day_count_convention: row.day_count_convention as LoanProductRow["day_count_convention"],
    payment_frequency: row.payment_frequency as LoanProductRow["payment_frequency"],
    amortization_type: row.amortization_type as LoanProductRow["amortization_type"],
    grace_period_type: row.grace_period_type as LoanProductRow["grace_period_type"],
    grace_period_days:
      row.grace_period_days == null ? null : Number(row.grace_period_days),
    status: row.status as LoanProductStatus,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function listLoanProducts(
  filters: ListLoanProductsFilters
): { products: LoanProductRow[]; total: number } {
  const conditions: string[] = [];
  const params: Record<string, string | number> = {
    limit: filters.limit,
    offset: filters.offset,
  };

  if (filters.status) {
    conditions.push("status = @status");
    params.status = filters.status;
  }
  if (filters.interest_type) {
    conditions.push("interest_type = @interest_type");
    params.interest_type = filters.interest_type;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const totalRow = getDb()
    .prepare(`SELECT COUNT(*) AS count FROM loan_products ${where}`)
    .get(params) as { count: number };

  const rows = getDb()
    .prepare(
      `SELECT ${LOAN_PRODUCT_COLUMNS}
       FROM loan_products
       ${where}
       ORDER BY created_at DESC
       LIMIT @limit OFFSET @offset`
    )
    .all(params) as Record<string, unknown>[];

  return {
    products: rows.map(mapLoanProductRow),
    total: totalRow.count,
  };
}

export function findLoanProductById(
  loanProductId: string
): LoanProductRow | undefined {
  const row = getDb()
    .prepare(`SELECT ${LOAN_PRODUCT_COLUMNS} FROM loan_products WHERE loan_product_id = ?`)
    .get(loanProductId) as Record<string, unknown> | undefined;

  return row ? mapLoanProductRow(row) : undefined;
}

export function insertLoanProduct(input: InsertLoanProductInput): LoanProductRow {
  const loan_product_id = `prd_${randomUUID()}`;
  const now = toIsoUtcNoMs(new Date());
  const grace_period_days =
    input.grace_period_type === "none" ? null : input.grace_period_days;

  getDb()
    .prepare(
      `INSERT INTO loan_products (
        loan_product_id, name, interest_type, annual_rate_bps,
        day_count_convention, payment_frequency, amortization_type,
        grace_period_type, grace_period_days, status, created_at, updated_at
      ) VALUES (
        @loan_product_id, @name, @interest_type, @annual_rate_bps,
        @day_count_convention, @payment_frequency, @amortization_type,
        @grace_period_type, @grace_period_days, 'active', @created_at, @updated_at
      )`
    )
    .run({
      loan_product_id,
      ...input,
      grace_period_days,
      created_at: now,
      updated_at: now,
    });

  return findLoanProductById(loan_product_id)!;
}

export function updateLoanProduct(
  loanProductId: string,
  input: UpdateLoanProductInput
): LoanProductRow | undefined {
  const existing = findLoanProductById(loanProductId);
  if (!existing) return undefined;

  const grace_period_type = input.grace_period_type ?? existing.grace_period_type;
  let grace_period_days: number | null;
  if (input.grace_period_days !== undefined) {
    grace_period_days = input.grace_period_days;
  } else if (input.grace_period_type !== undefined) {
    grace_period_days = input.grace_period_type === "none" ? null : existing.grace_period_days;
  } else {
    grace_period_days = existing.grace_period_days;
  }

  if (grace_period_type === "none") {
    grace_period_days = null;
  }

  const updated: LoanProductRow = {
    ...existing,
    ...input,
    grace_period_type,
    grace_period_days,
    updated_at: toIsoUtcNoMs(new Date()),
  };

  getDb()
    .prepare(
      `UPDATE loan_products SET
        name = @name,
        interest_type = @interest_type,
        annual_rate_bps = @annual_rate_bps,
        day_count_convention = @day_count_convention,
        payment_frequency = @payment_frequency,
        amortization_type = @amortization_type,
        grace_period_type = @grace_period_type,
        grace_period_days = @grace_period_days,
        updated_at = @updated_at
       WHERE loan_product_id = @loan_product_id`
    )
    .run(updated);

  return updated;
}

export function archiveLoanProduct(
  loanProductId: string
): LoanProductRow | undefined {
  const existing = findLoanProductById(loanProductId);
  if (!existing) return undefined;

  const updated_at = toIsoUtcNoMs(new Date());
  getDb()
    .prepare(
      `UPDATE loan_products SET status = 'archived', updated_at = ? WHERE loan_product_id = ?`
    )
    .run(updated_at, loanProductId);

  return { ...existing, status: "archived", updated_at };
}

export function unarchiveLoanProduct(
  loanProductId: string
): LoanProductRow | undefined {
  const existing = findLoanProductById(loanProductId);
  if (!existing) return undefined;

  const updated_at = toIsoUtcNoMs(new Date());
  getDb()
    .prepare(
      `UPDATE loan_products SET status = 'active', updated_at = ? WHERE loan_product_id = ?`
    )
    .run(updated_at, loanProductId);

  return { ...existing, status: "active", updated_at };
}

const LOAN_LEDGER_COLUMNS = `
  installed_app_id, instance_id, ledger_key, name, blnk_ledger_id, created_at, updated_at
`;

function mapLoanLedgerRow(row: Record<string, unknown>): LoanLedgerRow {
  return {
    installed_app_id: String(row.installed_app_id),
    instance_id: typeof row.instance_id === "string" ? row.instance_id : "",
    ledger_key: row.ledger_key as LoanLedgerKey,
    name: String(row.name),
    blnk_ledger_id: String(row.blnk_ledger_id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function listLoanLedgers(installedAppId: string): LoanLedgerRow[] {
  const rows = getDb()
    .prepare(
      `SELECT ${LOAN_LEDGER_COLUMNS}
       FROM loan_ledgers
       WHERE installed_app_id = ?
       ORDER BY ledger_key ASC`
    )
    .all(installedAppId) as Record<string, unknown>[];

  return rows.map(mapLoanLedgerRow);
}

export function getLoanLedgerByKey(
  installedAppId: string,
  ledgerKey: LoanLedgerKey
): LoanLedgerRow | undefined {
  const row = getDb()
    .prepare(
      `SELECT ${LOAN_LEDGER_COLUMNS}
       FROM loan_ledgers
       WHERE installed_app_id = ? AND ledger_key = ?`
    )
    .get(installedAppId, ledgerKey) as Record<string, unknown> | undefined;

  return row ? mapLoanLedgerRow(row) : undefined;
}

export function upsertLoanLedger(input: UpsertLoanLedgerInput): LoanLedgerRow {
  const now = toIsoUtcNoMs(new Date());
  const existing = getLoanLedgerByKey(input.installed_app_id, input.ledger_key);

  if (existing) {
    getDb()
      .prepare(
        `UPDATE loan_ledgers
         SET instance_id = @instance_id,
             name = @name,
             blnk_ledger_id = @blnk_ledger_id,
             updated_at = @updated_at
         WHERE installed_app_id = @installed_app_id AND ledger_key = @ledger_key`
      )
      .run({
        ...input,
        updated_at: now,
      });

    return {
      ...existing,
      instance_id: input.instance_id,
      name: input.name,
      blnk_ledger_id: input.blnk_ledger_id,
      updated_at: now,
    };
  }

  getDb()
    .prepare(
      `INSERT INTO loan_ledgers (
        installed_app_id, instance_id, ledger_key, name, blnk_ledger_id, created_at, updated_at
      ) VALUES (
        @installed_app_id, @instance_id, @ledger_key, @name, @blnk_ledger_id, @created_at, @updated_at
      )`
    )
    .run({
      ...input,
      created_at: now,
      updated_at: now,
    });

  return getLoanLedgerByKey(input.installed_app_id, input.ledger_key)!;
}

const LOAN_ELIGIBILITY_SETTINGS_COLUMNS = `
  installed_app_id, allowed_books, updated_at
`;

function isLoanBookType(value: unknown): value is LoanBookType {
  return value === "a_book" || value === "b_book" || value === "justo";
}

function parseAllowedBooksJson(json: string): LoanBookType[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [...DEFAULT_ALLOWED_LOAN_BOOKS];
    const books = parsed.filter(isLoanBookType);
    return books.length > 0 ? books : [...DEFAULT_ALLOWED_LOAN_BOOKS];
  } catch {
    return [...DEFAULT_ALLOWED_LOAN_BOOKS];
  }
}

function mapLoanEligibilitySettingsRow(
  row: Record<string, unknown>
): LoanEligibilitySettingsRow {
  return {
    installed_app_id: String(row.installed_app_id),
    allowed_books: parseAllowedBooksJson(String(row.allowed_books)),
    updated_at: String(row.updated_at),
  };
}

export function getLoanEligibilitySettings(
  installedAppId: string
): LoanEligibilitySettingsRow {
  const row = getDb()
    .prepare(
      `SELECT ${LOAN_ELIGIBILITY_SETTINGS_COLUMNS}
       FROM loan_eligibility_settings
       WHERE installed_app_id = ?`
    )
    .get(installedAppId) as Record<string, unknown> | undefined;

  if (!row) {
    return {
      installed_app_id: installedAppId,
      allowed_books: [...DEFAULT_ALLOWED_LOAN_BOOKS],
      updated_at: toIsoUtcNoMs(new Date()),
    };
  }

  return mapLoanEligibilitySettingsRow(row);
}

export function upsertLoanEligibilitySettings(
  input: UpsertLoanEligibilitySettingsInput
): LoanEligibilitySettingsRow {
  const now = toIsoUtcNoMs(new Date());
  const allowed_books = input.allowed_books.filter(isLoanBookType);
  const allowedBooksJson = JSON.stringify(allowed_books);

  getDb()
    .prepare(
      `INSERT INTO loan_eligibility_settings (
        installed_app_id, allowed_books, updated_at
      ) VALUES (
        @installed_app_id, @allowed_books, @updated_at
      )
      ON CONFLICT(installed_app_id) DO UPDATE SET
        allowed_books = excluded.allowed_books,
        updated_at = excluded.updated_at`
    )
    .run({
      installed_app_id: input.installed_app_id,
      allowed_books: allowedBooksJson,
      updated_at: now,
    });

  return {
    installed_app_id: input.installed_app_id,
    allowed_books,
    updated_at: now,
  };
}

const BRANDING_SETTINGS_COLUMNS = `
  installed_app_id, primary_color, updated_at
`;

function mapBrandingSettingsRow(
  row: Record<string, unknown>
): BrandingSettingsRow {
  return {
    installed_app_id: String(row.installed_app_id),
    primary_color: String(row.primary_color),
    updated_at: String(row.updated_at),
  };
}

export function getBrandingSettings(
  installedAppId: string
): BrandingSettingsRow {
  const row = getDb()
    .prepare(
      `SELECT ${BRANDING_SETTINGS_COLUMNS}
       FROM branding_settings
       WHERE installed_app_id = ?`
    )
    .get(installedAppId) as Record<string, unknown> | undefined;

  if (!row) {
    return {
      installed_app_id: installedAppId,
      primary_color: DEFAULT_BRANDING_PRIMARY_COLOR,
      updated_at: toIsoUtcNoMs(new Date()),
    };
  }

  return mapBrandingSettingsRow(row);
}

export function upsertBrandingSettings(
  input: UpsertBrandingSettingsInput
): BrandingSettingsRow {
  const now = toIsoUtcNoMs(new Date());

  getDb()
    .prepare(
      `INSERT INTO branding_settings (
        installed_app_id, primary_color, updated_at
      ) VALUES (
        @installed_app_id, @primary_color, @updated_at
      )
      ON CONFLICT(installed_app_id) DO UPDATE SET
        primary_color = excluded.primary_color,
        updated_at = excluded.updated_at`
    )
    .run({
      installed_app_id: input.installed_app_id,
      primary_color: input.primary_color,
      updated_at: now,
    });

  return {
    installed_app_id: input.installed_app_id,
    primary_color: input.primary_color,
    updated_at: now,
  };
}

// --- Loan applications (immutable after create) ---

export type LoanStatus = "pending_approval" | "approved" | "rejected";

export type LoanRow = {
  loan_id: string;
  installed_app_id: string;
  blnk_identity_id: string | null;
  loan_product_id: string;
  principal: number;
  origination_fee: number;
  net_disbursement: number;
  term_periods: number;
  first_payment_date: string;
  maturity_date: string;
  annual_rate_bps: number;
  effective_annual_rate_bps: number;
  day_count_convention: LoanProductRow["day_count_convention"];
  payment_frequency: LoanProductRow["payment_frequency"];
  amortization_type: LoanProductRow["amortization_type"];
  grace_period_type: LoanProductRow["grace_period_type"];
  grace_period_days: number | null;
  status: LoanStatus;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
  disbursement_date: string | null;
  blnk_transaction: string | null;
};

export type LoanScheduleRow = {
  loan_schedule_id: string;
  loan_id: string;
  period: number;
  payment_date: string;
  principal: number;
  interest: number;
  expected_payment: number;
  closing_principal: number;
  carrying_amount: number;
  eir_interest: number;
  fee_income: number;
  interest_blnk_transaction: string | null;
  status: SchedulePaymentStatus;
};

export type SchedulePaymentStatus = "scheduled" | "due" | "paid" | "overdue" | "void";

export type LoanDraftInput = Omit<LoanRow, "loan_id" | "created_at" | "installed_app_id">;

export type ScheduleLineInput = Omit<
  LoanScheduleRow,
  "loan_schedule_id" | "loan_id" | "interest_blnk_transaction"
>;

export type ListLoansFilters = {
  installedAppId: string;
  status?: LoanStatus;
  limit: number;
  offset: number;
};

const LOAN_COLUMNS = `
  loan_id, installed_app_id, blnk_identity_id, loan_product_id,
  principal, origination_fee, net_disbursement, term_periods,
  first_payment_date, maturity_date,
  annual_rate_bps, effective_annual_rate_bps,
  day_count_convention, payment_frequency, amortization_type,
  grace_period_type, grace_period_days,
  status, created_at, decided_at, decision_note, disbursement_date,
  blnk_transaction
`;

const LOAN_SCHEDULE_COLUMNS = `
  loan_schedule_id, loan_id, period, payment_date,
  principal, interest, expected_payment, closing_principal,
  carrying_amount, eir_interest, fee_income, interest_blnk_transaction, status
`;

function mapLoanRow(row: Record<string, unknown>): LoanRow {
  return {
    loan_id: String(row.loan_id),
    installed_app_id: String(row.installed_app_id),
    blnk_identity_id:
      row.blnk_identity_id == null || row.blnk_identity_id === ""
        ? null
        : String(row.blnk_identity_id),
    loan_product_id: String(row.loan_product_id),
    principal: Number(row.principal),
    origination_fee: Number(row.origination_fee),
    net_disbursement: Number(row.net_disbursement),
    term_periods: Number(row.term_periods),
    first_payment_date: String(row.first_payment_date),
    maturity_date: String(row.maturity_date),
    annual_rate_bps: Number(row.annual_rate_bps),
    effective_annual_rate_bps: Number(row.effective_annual_rate_bps),
    day_count_convention: row.day_count_convention as LoanRow["day_count_convention"],
    payment_frequency: row.payment_frequency as LoanRow["payment_frequency"],
    amortization_type: row.amortization_type as LoanRow["amortization_type"],
    grace_period_type: row.grace_period_type as LoanRow["grace_period_type"],
    grace_period_days:
      row.grace_period_days == null ? null : Number(row.grace_period_days),
    status: row.status as LoanStatus,
    created_at: String(row.created_at),
    decided_at: row.decided_at == null ? null : String(row.decided_at),
    decision_note: row.decision_note == null ? null : String(row.decision_note),
    disbursement_date:
      row.disbursement_date == null ? null : String(row.disbursement_date),
    blnk_transaction:
      row.blnk_transaction == null || row.blnk_transaction === ""
        ? null
        : String(row.blnk_transaction),
  };
}

function mapLoanScheduleRow(row: Record<string, unknown>): LoanScheduleRow {
  return {
    loan_schedule_id: String(row.loan_schedule_id),
    loan_id: String(row.loan_id),
    period: Number(row.period),
    payment_date: String(row.payment_date),
    principal: Number(row.principal),
    interest: Number(row.interest),
    expected_payment: Number(row.expected_payment),
    closing_principal: Number(row.closing_principal),
    carrying_amount: Number(row.carrying_amount),
    eir_interest: Number(row.eir_interest),
    fee_income: Number(row.fee_income),
    interest_blnk_transaction:
      row.interest_blnk_transaction == null ||
      row.interest_blnk_transaction === ""
        ? null
        : String(row.interest_blnk_transaction),
    status: row.status as SchedulePaymentStatus,
  };
}

/**
 * Persist a new loan and its full schedule atomically.
 * All computed fields must already be materialized by createLoanDraft.
 * Schedule payment status may be updated via setScheduleLinePaid.
 */
export function insertLoanWithSchedule(
  installedAppId: string,
  loan: LoanDraftInput,
  schedule: ScheduleLineInput[],
  options?: { loanId?: string }
): LoanRow {
  const database = getDb();
  const loan_id = options?.loanId ?? `loan_${randomUUID()}`;
  const created_at = toIsoUtcNoMs(new Date());
  const blnk_identity_id =
    loan.blnk_identity_id == null || loan.blnk_identity_id.trim() === ""
      ? null
      : loan.blnk_identity_id.trim();

  const tx = database.transaction(() => {
    database
      .prepare(
        `INSERT INTO loans (
          loan_id, installed_app_id, blnk_identity_id, loan_product_id,
          principal, origination_fee, net_disbursement, term_periods,
          first_payment_date, maturity_date,
          annual_rate_bps, effective_annual_rate_bps,
          day_count_convention, payment_frequency, amortization_type,
          grace_period_type, grace_period_days,
          status, created_at, decided_at, decision_note, disbursement_date,
          blnk_transaction
        ) VALUES (
          @loan_id, @installed_app_id, @blnk_identity_id, @loan_product_id,
          @principal, @origination_fee, @net_disbursement, @term_periods,
          @first_payment_date, @maturity_date,
          @annual_rate_bps, @effective_annual_rate_bps,
          @day_count_convention, @payment_frequency, @amortization_type,
          @grace_period_type, @grace_period_days,
          @status, @created_at, @decided_at, @decision_note, @disbursement_date,
          @blnk_transaction
        )`
      )
      .run({
        loan_id,
        installed_app_id: installedAppId,
        blnk_identity_id,
        loan_product_id: loan.loan_product_id,
        principal: loan.principal,
        origination_fee: loan.origination_fee,
        net_disbursement: loan.net_disbursement,
        term_periods: loan.term_periods,
        first_payment_date: loan.first_payment_date,
        maturity_date: loan.maturity_date,
        annual_rate_bps: loan.annual_rate_bps,
        effective_annual_rate_bps: loan.effective_annual_rate_bps,
        day_count_convention: loan.day_count_convention,
        payment_frequency: loan.payment_frequency,
        amortization_type: loan.amortization_type,
        grace_period_type: loan.grace_period_type,
        grace_period_days: loan.grace_period_days,
        status: loan.status,
        created_at,
        decided_at: loan.decided_at,
        decision_note: loan.decision_note,
        disbursement_date: loan.disbursement_date,
        blnk_transaction: loan.blnk_transaction,
      });

    const insertSchedule = database.prepare(
      `INSERT INTO loan_schedule (
        loan_schedule_id, loan_id, period, payment_date,
        principal, interest, expected_payment, closing_principal,
        carrying_amount, eir_interest, fee_income, status
      ) VALUES (
        @loan_schedule_id, @loan_id, @period, @payment_date,
        @principal, @interest, @expected_payment, @closing_principal,
        @carrying_amount, @eir_interest, @fee_income, @status
      )`
    );

    for (const line of schedule) {
      insertSchedule.run({
        loan_schedule_id: `ls_${randomUUID()}`,
        loan_id,
        period: line.period,
        payment_date: line.payment_date,
        principal: line.principal,
        interest: line.interest,
        expected_payment: line.expected_payment,
        closing_principal: line.closing_principal,
        carrying_amount: line.carrying_amount,
        eir_interest: line.eir_interest,
        fee_income: line.fee_income,
        status: line.status,
      });
    }
  });

  tx();

  return findLoanById(loan_id)!;
}

export function findLoanById(loanId: string): LoanRow | undefined {
  const row = getDb()
    .prepare(`SELECT ${LOAN_COLUMNS} FROM loans WHERE loan_id = ?`)
    .get(loanId) as Record<string, unknown> | undefined;
  return row ? mapLoanRow(row) : undefined;
}

export function findLoanForInstall(
  installedAppId: string,
  loanId: string
): LoanRow | undefined {
  const row = getDb()
    .prepare(
      `SELECT ${LOAN_COLUMNS} FROM loans WHERE loan_id = ? AND installed_app_id = ?`
    )
    .get(loanId, installedAppId) as Record<string, unknown> | undefined;
  return row ? mapLoanRow(row) : undefined;
}

export function setLoanBlnkTransaction(
  installedAppId: string,
  loanId: string,
  blnkTransaction: string
): LoanRow | undefined {
  const result = getDb()
    .prepare(
      `UPDATE loans
       SET blnk_transaction = ?
       WHERE installed_app_id = ?
         AND loan_id = ?
         AND status = 'pending_approval'
         AND blnk_transaction IS NULL`
    )
    .run(blnkTransaction, installedAppId, loanId);

  if (result.changes === 0) return undefined;
  return findLoanForInstall(installedAppId, loanId);
}

/** Load schedule from DB — never recompute from domain on read. */
export function findScheduleByLoanId(loanId: string): LoanScheduleRow[] {
  const rows = getDb()
    .prepare(
      `SELECT ${LOAN_SCHEDULE_COLUMNS} FROM loan_schedule WHERE loan_id = ? ORDER BY period ASC`
    )
    .all(loanId) as Record<string, unknown>[];
  return rows.map(mapLoanScheduleRow);
}

export function findScheduleLineById(
  loanId: string,
  loanScheduleId: string
): LoanScheduleRow | undefined {
  const row = getDb()
    .prepare(
      `SELECT ${LOAN_SCHEDULE_COLUMNS}
       FROM loan_schedule
       WHERE loan_id = ? AND loan_schedule_id = ?`
    )
    .get(loanId, loanScheduleId) as Record<string, unknown> | undefined;
  return row ? mapLoanScheduleRow(row) : undefined;
}

export function markScheduleLineInterestAccrualSimulated(
  loanId: string,
  loanScheduleId: string
): LoanScheduleRow | undefined {
  const result = getDb()
    .prepare(
      `UPDATE loan_schedule
       SET interest_blnk_transaction = ?
       WHERE loan_id = ?
         AND loan_schedule_id = ?
         AND interest_blnk_transaction IS NULL`
    )
    .run(loanScheduleId, loanId, loanScheduleId);

  if (result.changes === 0) return undefined;
  return findScheduleLineById(loanId, loanScheduleId);
}

export type LoanRepaymentRow = {
  loan_repayment_id: string;
  loan_id: string;
  loan_schedule_id: string;
  total_amount_paid: number;
  created_at: string;
};

export type InsertLoanRepaymentInput = {
  loan_repayment_id: string;
  loan_id: string;
  loan_schedule_id: string;
  total_amount_paid: number;
};

function mapLoanRepaymentRow(row: Record<string, unknown>): LoanRepaymentRow {
  return {
    loan_repayment_id: String(row.loan_repayment_id),
    loan_id: String(row.loan_id),
    loan_schedule_id: String(row.loan_schedule_id),
    total_amount_paid: Number(row.total_amount_paid),
    created_at: String(row.created_at),
  };
}

export function findLoanRepaymentByScheduleLine(
  loanScheduleId: string
): LoanRepaymentRow | undefined {
  const row = getDb()
    .prepare(
      `SELECT loan_repayment_id, loan_id, loan_schedule_id, total_amount_paid, created_at
       FROM loan_repayments
       WHERE loan_schedule_id = ?`
    )
    .get(loanScheduleId) as Record<string, unknown> | undefined;
  return row ? mapLoanRepaymentRow(row) : undefined;
}

export type LoanRepaymentLineRow = LoanRepaymentRow & {
  period: number;
  payment_date: string;
  principal: number;
  interest: number;
  expected_payment: number;
};

function mapLoanRepaymentLineRow(row: Record<string, unknown>): LoanRepaymentLineRow {
  return {
    ...mapLoanRepaymentRow(row),
    period: Number(row.period),
    payment_date: String(row.payment_date),
    principal: Number(row.principal),
    interest: Number(row.interest),
    expected_payment: Number(row.expected_payment),
  };
}

export function findRepaymentsByLoanId(loanId: string): LoanRepaymentLineRow[] {
  const rows = getDb()
    .prepare(
      `SELECT
        r.loan_repayment_id,
        r.loan_id,
        r.loan_schedule_id,
        r.total_amount_paid,
        r.created_at,
        s.period,
        s.payment_date,
        s.principal,
        s.interest,
        s.expected_payment
       FROM loan_repayments r
       INNER JOIN loan_schedule s ON s.loan_schedule_id = r.loan_schedule_id
       WHERE r.loan_id = ?
       ORDER BY s.period ASC`
    )
    .all(loanId) as Record<string, unknown>[];

  return rows.map(mapLoanRepaymentLineRow);
}

export function insertLoanRepaymentAndMarkPaid(
  input: InsertLoanRepaymentInput
): { repayment: LoanRepaymentRow; line: LoanScheduleRow } | undefined {
  const database = getDb();
  const created_at = toIsoUtcNoMs(new Date());

  const tx = database.transaction(() => {
    database
      .prepare(
        `INSERT INTO loan_repayments (
          loan_repayment_id, loan_id, loan_schedule_id, total_amount_paid, created_at
        ) VALUES (
          @loan_repayment_id, @loan_id, @loan_schedule_id, @total_amount_paid, @created_at
        )`
      )
      .run({ ...input, created_at });

    const line = setScheduleLinePaid(input.loan_id, input.loan_schedule_id);
    if (!line) {
      throw new Error("schedule_line_not_payable");
    }

    const repaymentRow = database
      .prepare(
        `SELECT loan_repayment_id, loan_id, loan_schedule_id, total_amount_paid, created_at
         FROM loan_repayments
         WHERE loan_repayment_id = ?`
      )
      .get(input.loan_repayment_id) as Record<string, unknown>;

    return {
      repayment: mapLoanRepaymentRow(repaymentRow),
      line,
    };
  });

  try {
    return tx();
  } catch {
    return undefined;
  }
}

export function setScheduleLinePaid(
  loanId: string,
  loanScheduleId: string
): LoanScheduleRow | undefined {
  const database = getDb();
  const result = database
    .prepare(
      `UPDATE loan_schedule
       SET status = 'paid'
       WHERE loan_id = ? AND loan_schedule_id = ? AND status IN ('scheduled', 'due', 'overdue')`
    )
    .run(loanId, loanScheduleId);

  if (result.changes === 0) {
    return undefined;
  }

  return findScheduleLineById(loanId, loanScheduleId);
}

export function setScheduleLineDue(
  loanId: string,
  loanScheduleId: string
): LoanScheduleRow | undefined {
  const database = getDb();
  const result = database
    .prepare(
      `UPDATE loan_schedule
       SET status = 'due'
       WHERE loan_id = ? AND loan_schedule_id = ? AND status = 'scheduled'`
    )
    .run(loanId, loanScheduleId);

  if (result.changes === 0) {
    return undefined;
  }

  return findScheduleLineById(loanId, loanScheduleId);
}

export function listLoans(filters: ListLoansFilters): {
  loans: LoanRow[];
  total: number;
} {
  const conditions: string[] = ["installed_app_id = ?"];
  const params: unknown[] = [filters.installedAppId];

  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const totalRow = getDb()
    .prepare(`SELECT COUNT(*) AS count FROM loans ${where}`)
    .get(...params) as { count: number };

  const rows = getDb()
    .prepare(
      `SELECT ${LOAN_COLUMNS} FROM loans ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, filters.limit, filters.offset) as Record<string, unknown>[];

  return {
    loans: rows.map(mapLoanRow),
    total: totalRow.count,
  };
}

export function setLoanApproved(loanId: string): LoanRow | undefined {
  const existing = findLoanById(loanId);
  if (!existing || existing.status !== "pending_approval") return undefined;

  const decided_at = toIsoUtcNoMs(new Date());
  getDb()
    .prepare(
      `UPDATE loans SET status = 'approved', decided_at = ?, decision_note = NULL WHERE loan_id = ?`
    )
    .run(decided_at, loanId);

  return { ...existing, status: "approved", decided_at, decision_note: null };
}

export function approveLoanWithFinalizedSchedule(
  loanId: string,
  schedule: ScheduleLineInput[],
  effectiveAnnualRateBps: number,
  disbursementDate: string
): LoanRow | undefined {
  const existing = findLoanById(loanId);
  if (!existing || existing.status !== "pending_approval") return undefined;

  const database = getDb();
  const decided_at = toIsoUtcNoMs(new Date());

  const tx = database.transaction(() => {
    const statusUpdate = database
      .prepare(
        `UPDATE loans
         SET status = 'approved',
             decided_at = ?,
             decision_note = NULL,
             disbursement_date = ?,
             effective_annual_rate_bps = ?
         WHERE loan_id = ? AND status = 'pending_approval'`
      )
      .run(decided_at, disbursementDate, effectiveAnnualRateBps, loanId);

    if (statusUpdate.changes === 0) {
      throw new Error("Loan is no longer pending approval.");
    }

    const existingRows = database
      .prepare(
        `SELECT ${LOAN_SCHEDULE_COLUMNS} FROM loan_schedule WHERE loan_id = ? ORDER BY period ASC`
      )
      .all(loanId) as Record<string, unknown>[];

    if (existingRows.length !== schedule.length) {
      throw new Error("Schedule row count mismatch on approval.");
    }

    const updateSchedule = database.prepare(
      `UPDATE loan_schedule
       SET payment_date = @payment_date,
           principal = @principal,
           interest = @interest,
           expected_payment = @expected_payment,
           closing_principal = @closing_principal,
           carrying_amount = @carrying_amount,
           eir_interest = @eir_interest,
           fee_income = @fee_income
       WHERE loan_id = @loan_id AND period = @period`
    );

    for (const line of schedule) {
      const existingRow = existingRows.find(
        (row) => Number(row.period) === line.period
      );
      if (!existingRow) {
        throw new Error(`Missing schedule row for period ${line.period}.`);
      }

      updateSchedule.run({
        loan_id: loanId,
        period: line.period,
        payment_date: line.payment_date,
        principal: line.principal,
        interest: line.interest,
        expected_payment: line.expected_payment,
        closing_principal: line.closing_principal,
        carrying_amount: line.carrying_amount,
        eir_interest: line.eir_interest,
        fee_income: line.fee_income,
      });
    }
  });

  try {
    tx();
  } catch {
    return undefined;
  }

  return findLoanById(loanId);
}

export function setLoanRejected(
  loanId: string,
  decisionNote: string | null
): LoanRow | undefined {
  const existing = findLoanById(loanId);
  if (!existing || existing.status !== "pending_approval") return undefined;

  const decided_at = toIsoUtcNoMs(new Date());
  const result = getDb()
    .prepare(
      `UPDATE loans SET status = 'rejected', decided_at = ?, decision_note = ? WHERE loan_id = ? AND status = 'pending_approval'`
    )
    .run(decided_at, decisionNote, loanId);

  if (result.changes === 0) {
    return undefined;
  }

  return { ...existing, status: "rejected", decided_at, decision_note: decisionNote };
}

export function resetDbForTests(): void {
  if (db) {
    db.close();
    db = null;
  }
}
