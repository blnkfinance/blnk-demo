package blnkaccounts

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	KeyLedger              = "ledger"
	KeyOperating           = "operating"
	KeyBankInflow          = "bank_inflow"
	KeyAccountsPayable     = "accounts_payable"
	KeyPurchaseExpense     = "purchase_expense"
	KeyTaxPayableWHT       = "tax_payable_wht"
	KeyFIRSRemittance      = "firs_remittance"
	KeyLiabilityClearing   = "liability_clearing"
	KeyMerchantMatcherRule = "merchant_matcher_rule"
)

type Account struct {
	ID            string
	Key           string
	BlnkBalanceID string
	BlnkRuleID    string
	LedgerID      string
	Indicator     string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) GetByKey(ctx context.Context, key string) (*Account, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, key, blnk_balance_id, blnk_rule_id, ledger_id, indicator, created_at, updated_at
		FROM blnk_system_accounts WHERE key = $1
	`, key)
	return scanAccount(row)
}

func (r *Repository) Upsert(ctx context.Context, a *Account) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO blnk_system_accounts (key, blnk_balance_id, blnk_rule_id, ledger_id, indicator, updated_at)
		VALUES ($1, $2, $3, $4, $5, now())
		ON CONFLICT (key) DO UPDATE SET
			blnk_balance_id = EXCLUDED.blnk_balance_id,
			blnk_rule_id = EXCLUDED.blnk_rule_id,
			ledger_id = EXCLUDED.ledger_id,
			indicator = EXCLUDED.indicator,
			updated_at = now()
	`, a.Key, a.BlnkBalanceID, a.BlnkRuleID, a.LedgerID, a.Indicator)
	return err
}

func scanAccount(row pgx.Row) (*Account, error) {
	var a Account
	if err := row.Scan(&a.ID, &a.Key, &a.BlnkBalanceID, &a.BlnkRuleID, &a.LedgerID, &a.Indicator, &a.CreatedAt, &a.UpdatedAt); err != nil {
		return nil, fmt.Errorf("blnk system account not found")
	}
	return &a, nil
}
