package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/mock-bank/internal/accounts"
	"github.com/blnk-demo/pay-recon/mock-bank/internal/accounts/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgres(pool *pgxpool.Pool) accounts.Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, a *model.Account) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO bank_accounts (id, account_number, account_name, balance, account_type)
		VALUES ($1,$2,$3,$4,$5)
	`, a.ID, a.AccountNumber, a.AccountName, a.Balance, a.AccountType)
	return err
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.Account, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, account_number, account_name, balance, account_type, now()
		FROM bank_accounts WHERE id = $1
	`, id)
	var a model.Account
	if err := row.Scan(&a.ID, &a.AccountNumber, &a.AccountName, &a.Balance, &a.AccountType, &a.CreatedAt); err != nil {
		return nil, fmt.Errorf("account not found")
	}
	return &a, nil
}

func (r *PostgresRepository) GetOperating(ctx context.Context) (*model.Account, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, account_number, account_name, balance, account_type, now()
		FROM bank_accounts WHERE account_type = 'operating'
		ORDER BY CASE WHEN account_number = 'HB-OPERATING-001' THEN 0 ELSE 1 END, account_name
		LIMIT 1
	`)
	var a model.Account
	if err := row.Scan(&a.ID, &a.AccountNumber, &a.AccountName, &a.Balance, &a.AccountType, &a.CreatedAt); err != nil {
		return nil, fmt.Errorf("operating account not found")
	}
	return &a, nil
}

func (r *PostgresRepository) List(ctx context.Context) ([]*model.Account, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, account_number, account_name, balance, account_type, now()
		FROM bank_accounts ORDER BY account_name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.Account
	for rows.Next() {
		var a model.Account
		if err := rows.Scan(&a.ID, &a.AccountNumber, &a.AccountName, &a.Balance, &a.AccountType, &a.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, &a)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) FundOperating(ctx context.Context, amount int64, reference string) (*model.Account, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	account, err := r.GetOperating(ctx)
	if err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `UPDATE bank_accounts SET balance = balance + $2 WHERE id = $1`, account.ID, amount); err != nil {
		return nil, err
	}

	narration := strings.TrimSpace(reference)
	if narration == "" {
		narration = "Account funding"
	}
	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, `
		INSERT INTO bank_transactions (id, bank_transaction_id, from_account_id, to_account_id, amount, narration, transaction_date, status)
		VALUES ($1,$2,NULL,$3,$4,$5,$6,$7)
	`, uuid.NewString(), generateFundingTransactionID(now), account.ID, amount, narration, now, "completed"); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetOperating(ctx)
}

func (r *PostgresRepository) UpdateBalance(ctx context.Context, id string, balance int64) error {
	_, err := r.pool.Exec(ctx, `UPDATE bank_accounts SET balance = $2 WHERE id = $1`, id, balance)
	return err
}

func generateFundingTransactionID(now time.Time) string {
	suffix := strings.ToUpper(strings.ReplaceAll(uuid.NewString()[:8], "-", ""))
	return fmt.Sprintf("FND-%s-%s", now.Format("20060102"), suffix)
}
