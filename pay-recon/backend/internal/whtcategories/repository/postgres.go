package repository

import (
	"context"
	"fmt"

	"github.com/blnk-demo/pay-recon/backend/internal/whtcategories"
	"github.com/blnk-demo/pay-recon/backend/internal/whtcategories/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgres(pool *pgxpool.Pool) whtcategories.Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, c *model.Category) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO wht_categories (id, code, label, rate, active, effective_from)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, c.ID, c.Code, c.Label, c.Rate, c.Active, c.EffectiveFrom)
	return err
}

func (r *PostgresRepository) UpsertByCode(ctx context.Context, c *model.Category) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO wht_categories (id, code, label, rate, active, effective_from)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, rate = EXCLUDED.rate, active = EXCLUDED.active
	`, c.ID, c.Code, c.Label, c.Rate, c.Active, c.EffectiveFrom)
	return err
}

func (r *PostgresRepository) ListActive(ctx context.Context) ([]*model.Category, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, code, label, rate, active, effective_from
		FROM wht_categories WHERE active = true ORDER BY code
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanCategories(rows)
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.Category, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, code, label, rate, active, effective_from FROM wht_categories WHERE id = $1
	`, id)
	return scanCategory(row)
}

func (r *PostgresRepository) GetByCode(ctx context.Context, code string) (*model.Category, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, code, label, rate, active, effective_from FROM wht_categories WHERE code = $1
	`, code)
	return scanCategory(row)
}

type scannable interface {
	Scan(dest ...any) error
}

func scanCategory(row scannable) (*model.Category, error) {
	var c model.Category
	if err := row.Scan(&c.ID, &c.Code, &c.Label, &c.Rate, &c.Active, &c.EffectiveFrom); err != nil {
		return nil, fmt.Errorf("wht category not found")
	}
	return &c, nil
}

func scanCategories(rows interface {
	Next() bool
	Scan(dest ...any) error
}) ([]*model.Category, error) {
	var items []*model.Category
	for rows.Next() {
		var c model.Category
		if err := rows.Scan(&c.ID, &c.Code, &c.Label, &c.Rate, &c.Active, &c.EffectiveFrom); err != nil {
			return nil, err
		}
		items = append(items, &c)
	}
	return items, nil
}
