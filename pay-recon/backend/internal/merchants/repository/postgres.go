package repository

import (
	"context"
	"fmt"

	"github.com/blnk-demo/pay-recon/backend/internal/merchants"
	"github.com/blnk-demo/pay-recon/backend/internal/merchants/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgres(pool *pgxpool.Pool) merchants.Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, m *model.Merchant) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO merchants (id, name, tin, bank_account_number, bank_name, blnk_balance_id, blnk_identity_id, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, m.ID, m.Name, m.TIN, m.BankAccountNumber, m.BankName, m.BlnkBalanceID, m.BlnkIdentityID, m.Status, m.CreatedAt)
	return err
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.Merchant, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, name, tin, bank_account_number, bank_name, blnk_balance_id, blnk_identity_id, status, created_at
		FROM merchants WHERE id = $1
	`, id)
	return scanMerchant(row)
}

func (r *PostgresRepository) List(ctx context.Context) ([]*model.Merchant, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, tin, bank_account_number, bank_name, blnk_balance_id, blnk_identity_id, status, created_at
		FROM merchants ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.Merchant
	for rows.Next() {
		m, err := scanMerchant(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, m)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) Update(ctx context.Context, m *model.Merchant) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE merchants SET name=$2, tin=$3, bank_account_number=$4, bank_name=$5, status=$6 WHERE id=$1
	`, m.ID, m.Name, m.TIN, m.BankAccountNumber, m.BankName, m.Status)
	return err
}

type scannable interface {
	Scan(dest ...any) error
}

func scanMerchant(row scannable) (*model.Merchant, error) {
	var m model.Merchant
	if err := row.Scan(&m.ID, &m.Name, &m.TIN, &m.BankAccountNumber, &m.BankName, &m.BlnkBalanceID, &m.BlnkIdentityID, &m.Status, &m.CreatedAt); err != nil {
		return nil, fmt.Errorf("merchant not found")
	}
	return &m, nil
}
