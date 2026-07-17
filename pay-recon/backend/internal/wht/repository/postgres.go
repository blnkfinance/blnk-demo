package repository

import (
	"context"

	"github.com/blnk-demo/pay-recon/backend/internal/wht"
	"github.com/blnk-demo/pay-recon/backend/internal/wht/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgres(pool *pgxpool.Pool) wht.Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, rec *model.Record) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO wht_records (id, bill_id, merchant_id, amount_cents, rate_bps, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, rec.ID, rec.BillID, rec.MerchantID, rec.AmountCents, rec.RateBPS, rec.Status, rec.CreatedAt)
	return err
}

func (r *PostgresRepository) List(ctx context.Context, page, pageSize int) ([]*model.Record, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	var total int64
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM wht_records`).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id, bill_id, merchant_id, amount_cents, rate_bps, status, created_at
		FROM wht_records ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []*model.Record
	for rows.Next() {
		var rec model.Record
		if err := rows.Scan(&rec.ID, &rec.BillID, &rec.MerchantID, &rec.AmountCents, &rec.RateBPS, &rec.Status, &rec.CreatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, &rec)
	}
	return items, total, rows.Err()
}
