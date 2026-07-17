package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/admin"
	"github.com/blnk-demo/pay-recon/backend/internal/admin/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgres(pool *pgxpool.Pool) admin.Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, a *model.Admin) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO admins (id, email, first_name, last_name, password_hash, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, a.ID, strings.ToLower(a.Email), a.FirstName, a.LastName, a.PasswordHash, a.CreatedAt, a.UpdatedAt)
	return err
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.Admin, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, email, first_name, last_name, password_hash, created_at, updated_at
		FROM admins WHERE id = $1
	`, id)
	return scanAdmin(row)
}

func (r *PostgresRepository) GetByEmail(ctx context.Context, email string) (*model.Admin, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, email, first_name, last_name, password_hash, created_at, updated_at
		FROM admins WHERE email = $1
	`, strings.ToLower(strings.TrimSpace(email)))
	return scanAdmin(row)
}

func (r *PostgresRepository) Update(ctx context.Context, a *model.Admin) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE admins SET email=$2, first_name=$3, last_name=$4, password_hash=$5, updated_at=$6
		WHERE id=$1
	`, a.ID, strings.ToLower(a.Email), a.FirstName, a.LastName, a.PasswordHash, time.Now().UTC())
	return err
}

func (r *PostgresRepository) List(ctx context.Context, page, pageSize int) ([]*model.Admin, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	var total int64
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM admins`).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id, email, first_name, last_name, password_hash, created_at, updated_at
		FROM admins ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var admins []*model.Admin
	for rows.Next() {
		a, err := scanAdmin(rows)
		if err != nil {
			return nil, 0, err
		}
		admins = append(admins, a)
	}
	return admins, total, rows.Err()
}

func (r *PostgresRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM admins`).Scan(&count)
	return count, err
}

type scannable interface {
	Scan(dest ...any) error
}

func scanAdmin(row scannable) (*model.Admin, error) {
	var a model.Admin
	if err := row.Scan(&a.ID, &a.Email, &a.FirstName, &a.LastName, &a.PasswordHash, &a.CreatedAt, &a.UpdatedAt); err != nil {
		return nil, fmt.Errorf("admin not found")
	}
	return &a, nil
}
