package postgres

import (
	"context"
	"fmt"
)

const schemaSQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blnk_system_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    blnk_balance_id TEXT NOT NULL DEFAULT '',
    blnk_rule_id TEXT NOT NULL DEFAULT '',
    ledger_id TEXT NOT NULL DEFAULT '',
    indicator TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tin TEXT,
    bank_account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    blnk_balance_id TEXT NOT NULL,
    blnk_identity_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wht_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    rate NUMERIC(5,4) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_reference TEXT UNIQUE NOT NULL,
    vendor_invoice_ref TEXT,
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    wht_category_id UUID NOT NULL REFERENCES wht_categories(id),
    purpose TEXT NOT NULL,
    gross_amount BIGINT NOT NULL,
    wht_rate NUMERIC(5,4) NOT NULL,
    wht_amount BIGINT NOT NULL,
    net_amount BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'awaiting_payment',
    bank_payment_reference TEXT,
    bank_payment_date DATE,
    payment_confirmed_at TIMESTAMPTZ,
    payment_confirmed_by TEXT,
    payment_note TEXT,
    blnk_net_txn_id TEXT NOT NULL,
    blnk_wht_txn_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS statement_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blnk_upload_id TEXT NOT NULL,
    source TEXT NOT NULL,
    cadence TEXT NOT NULL DEFAULT 'daily',
    record_count INT NOT NULL,
    rows_read INT NOT NULL DEFAULT 0,
    rows_imported INT NOT NULL DEFAULT 0,
    rows_skipped INT NOT NULL DEFAULT 0,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blnk_reconciliation_id TEXT NOT NULL,
    statement_upload_id UUID NOT NULL REFERENCES statement_uploads(id),
    strategy TEXT NOT NULL DEFAULT 'one_to_one',
    matched_count INT,
    unmatched_count INT,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_run_id UUID NOT NULL REFERENCES reconciliation_runs(id),
    exception_type TEXT NOT NULL,
    bill_id UUID REFERENCES bills(id),
    external_record JSONB,
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_remittances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period TEXT NOT NULL,
    total_amount BIGINT NOT NULL,
    blnk_txn_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    bank_payment_reference TEXT,
    bank_payment_date DATE,
    payment_confirmed_at TIMESTAMPTZ,
    payment_note TEXT,
    remitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID NOT NULL REFERENCES statement_uploads(id),
    transaction_id TEXT,
    narration TEXT,
    beneficiary_account TEXT,
    debit BIGINT NOT NULL DEFAULT 0,
    credit BIGINT NOT NULL DEFAULT 0,
    balance BIGINT NOT NULL DEFAULT 0,
    line_date DATE NOT NULL,
    matched_bill_id UUID REFERENCES bills(id),
    matched_remittance_id UUID REFERENCES tax_remittances(id),
    ledger_synced BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_statement_lines_upload_id ON statement_lines(upload_id);
CREATE INDEX IF NOT EXISTS idx_bills_merchant_id ON bills(merchant_id);
CREATE INDEX IF NOT EXISTS idx_bills_blnk_net_txn_id ON bills(blnk_net_txn_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_exceptions_run_id ON reconciliation_exceptions(reconciliation_run_id);

CREATE TABLE IF NOT EXISTS bill_reference_counters (
    day DATE PRIMARY KEY,
    next_seq INT NOT NULL DEFAULT 1
);
`

func Migrate(ctx context.Context, c *Client) error {
	if c == nil || c.Pool == nil {
		return fmt.Errorf("postgres client is nil")
	}
	if _, err := c.Pool.Exec(ctx, schemaSQL); err != nil {
		return fmt.Errorf("migrate schema: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `ALTER TABLE bills ADD COLUMN IF NOT EXISTS vendor_invoice_ref TEXT`); err != nil {
		return fmt.Errorf("migrate bills vendor_invoice_ref: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `
		ALTER TABLE bills
		ADD COLUMN IF NOT EXISTS bank_payment_reference TEXT,
		ADD COLUMN IF NOT EXISTS bank_payment_date DATE,
		ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
		ADD COLUMN IF NOT EXISTS payment_confirmed_by TEXT,
		ADD COLUMN IF NOT EXISTS payment_note TEXT
	`); err != nil {
		return fmt.Errorf("migrate bills payment confirmation: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS statement_lines (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			upload_id UUID NOT NULL REFERENCES statement_uploads(id),
			transaction_id TEXT,
			narration TEXT,
			beneficiary_account TEXT,
			debit BIGINT NOT NULL DEFAULT 0,
			credit BIGINT NOT NULL DEFAULT 0,
			balance BIGINT NOT NULL DEFAULT 0,
			line_date DATE NOT NULL,
			matched_bill_id UUID REFERENCES bills(id),
			matched_remittance_id UUID REFERENCES tax_remittances(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`); err != nil {
		return fmt.Errorf("migrate statement_lines: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `CREATE INDEX IF NOT EXISTS idx_statement_lines_upload_id ON statement_lines(upload_id)`); err != nil {
		return fmt.Errorf("migrate statement_lines index: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `ALTER TABLE statement_lines ADD COLUMN IF NOT EXISTS ledger_synced BOOLEAN NOT NULL DEFAULT false`); err != nil {
		return fmt.Errorf("migrate statement_lines ledger_synced: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `ALTER TABLE statement_lines ADD COLUMN IF NOT EXISTS matched_remittance_id UUID REFERENCES tax_remittances(id)`); err != nil {
		return fmt.Errorf("migrate statement_lines matched_remittance_id: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `
		ALTER TABLE tax_remittances
		ADD COLUMN IF NOT EXISTS bank_payment_reference TEXT,
		ADD COLUMN IF NOT EXISTS bank_payment_date DATE,
		ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
		ADD COLUMN IF NOT EXISTS payment_note TEXT
	`); err != nil {
		return fmt.Errorf("migrate tax_remittances bank payment: %w", err)
	}
	if err := migrateStatementDedupe(ctx, c); err != nil {
		return err
	}
	return nil
}

func migrateStatementDedupe(ctx context.Context, c *Client) error {
	if _, err := c.Pool.Exec(ctx, `
		ALTER TABLE statement_uploads
		ADD COLUMN IF NOT EXISTS cadence TEXT NOT NULL DEFAULT 'daily',
		ADD COLUMN IF NOT EXISTS rows_read INT NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS rows_imported INT NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS rows_skipped INT NOT NULL DEFAULT 0
	`); err != nil {
		return fmt.Errorf("migrate statement_uploads cadence: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `ALTER TABLE statement_lines ADD COLUMN IF NOT EXISTS dedupe_key TEXT`); err != nil {
		return fmt.Errorf("migrate statement_lines dedupe_key: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `
		UPDATE statement_lines sl
		SET dedupe_key = lower(trim(su.source)) || '|txn|' || upper(trim(sl.transaction_id))
		FROM statement_uploads su
		WHERE sl.upload_id = su.id
		  AND (sl.dedupe_key IS NULL OR sl.dedupe_key = '')
		  AND sl.transaction_id IS NOT NULL
		  AND trim(sl.transaction_id) <> ''
	`); err != nil {
		return fmt.Errorf("backfill statement_lines dedupe_key txn: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `
		UPDATE statement_lines sl
		SET dedupe_key = lower(trim(su.source)) || '|fp|'
			|| to_char(sl.line_date, 'YYYY-MM-DD') || '|'
			|| sl.debit::text || '|' || sl.credit::text || '|'
			|| coalesce(trim(sl.beneficiary_account), '') || '|'
			|| coalesce(trim(sl.narration), '')
		FROM statement_uploads su
		WHERE sl.upload_id = su.id
		  AND (sl.dedupe_key IS NULL OR sl.dedupe_key = '')
	`); err != nil {
		return fmt.Errorf("backfill statement_lines dedupe_key fp: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `
		UPDATE statement_uploads
		SET rows_read = record_count,
		    rows_imported = record_count,
		    rows_skipped = 0
		WHERE rows_read = 0 AND record_count > 0
	`); err != nil {
		return fmt.Errorf("backfill statement_uploads stats: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `
		DELETE FROM statement_lines sl
		WHERE sl.id IN (
			SELECT id FROM (
				SELECT id,
					ROW_NUMBER() OVER (
						PARTITION BY dedupe_key
						ORDER BY
							(CASE WHEN matched_bill_id IS NOT NULL OR matched_remittance_id IS NOT NULL THEN 0 ELSE 1 END),
							created_at ASC
					) AS rn
				FROM statement_lines
				WHERE dedupe_key IS NOT NULL AND dedupe_key <> ''
			) ranked
			WHERE rn > 1
		)
	`); err != nil {
		return fmt.Errorf("dedupe statement_lines duplicates: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `
		CREATE UNIQUE INDEX IF NOT EXISTS idx_statement_lines_dedupe_key
		ON statement_lines(dedupe_key)
	`); err != nil {
		return fmt.Errorf("migrate statement_lines dedupe_key index: %w", err)
	}
	return nil
}
