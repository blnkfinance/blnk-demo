package postgres

import (
	"context"
	"fmt"
)

const schemaSQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number TEXT UNIQUE NOT NULL,
    account_name TEXT NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0,
    account_type TEXT NOT NULL DEFAULT 'external'
);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_transaction_id TEXT UNIQUE,
    from_account_id UUID REFERENCES bank_accounts(id),
    to_account_id UUID REFERENCES bank_accounts(id),
    amount BIGINT NOT NULL,
    narration TEXT NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'completed'
);

INSERT INTO bank_accounts (id, account_number, account_name, balance, account_type)
VALUES ('00000000-0000-0000-0000-000000000001', 'HB-OPERATING-001', 'PayRecon Demo Company Operating', 0, 'operating')
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO bank_accounts (id, account_number, account_name, balance, account_type)
VALUES ('00000000-0000-0000-0000-0000000000f1', 'FIRS-WHT-001', 'Federal Inland Revenue Service - WHT', 0, 'beneficiary')
ON CONFLICT (account_number) DO NOTHING;
`

func Migrate(ctx context.Context, c *Client) error {
	if c == nil || c.Pool == nil {
		return fmt.Errorf("postgres client is nil")
	}
	if _, err := c.Pool.Exec(ctx, schemaSQL); err != nil {
		return fmt.Errorf("migrate schema: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `
		ALTER TABLE bank_transactions
		ADD COLUMN IF NOT EXISTS bank_transaction_id TEXT
	`); err != nil {
		return fmt.Errorf("migrate bank_transaction_id: %w", err)
	}
	if _, err := c.Pool.Exec(ctx, `
		UPDATE bank_transactions
		SET bank_transaction_id = 'BNK-' || to_char(transaction_date AT TIME ZONE 'UTC', 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 8))
		WHERE bank_transaction_id IS NULL
	`); err != nil {
		return fmt.Errorf("backfill bank_transaction_id: %w", err)
	}
	return nil
}
