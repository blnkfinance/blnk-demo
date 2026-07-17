package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/remittances"
	"github.com/blnk-demo/pay-recon/backend/internal/remittances/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgres(pool *pgxpool.Pool) remittances.Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, rem *model.Remittance) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO tax_remittances (id, period, total_amount, blnk_txn_id, status, created_at)
		VALUES ($1,$2,$3,$4,$5,$6)
	`, rem.ID, rem.Period, rem.TotalAmount, rem.BlnkTxnID, rem.Status, rem.CreatedAt)
	return err
}

func (r *PostgresRepository) List(ctx context.Context) ([]*model.Remittance, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, period, total_amount, blnk_txn_id, status,
			bank_payment_reference, bank_payment_date, payment_confirmed_at, payment_note,
			remitted_at, created_at
		FROM tax_remittances ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.Remittance
	for rows.Next() {
		var rem model.Remittance
		if err := scanRemittance(rows, &rem); err != nil {
			return nil, err
		}
		items = append(items, &rem)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.Remittance, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, period, total_amount, blnk_txn_id, status,
			bank_payment_reference, bank_payment_date, payment_confirmed_at, payment_note,
			remitted_at, created_at
		FROM tax_remittances WHERE id = $1
	`, id)
	var rem model.Remittance
	if err := scanRemittance(row, &rem); err != nil {
		return nil, fmt.Errorf("remittance not found")
	}
	return &rem, nil
}

func (r *PostgresRepository) ListPaidUnreconciled(ctx context.Context) ([]*model.Remittance, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, period, total_amount, blnk_txn_id, status,
			bank_payment_reference, bank_payment_date, payment_confirmed_at, payment_note,
			remitted_at, created_at
		FROM tax_remittances
		WHERE status = $1
		ORDER BY created_at
	`, model.StatusPaidUnreconciled)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.Remittance
	for rows.Next() {
		var rem model.Remittance
		if err := scanRemittance(rows, &rem); err != nil {
			return nil, err
		}
		items = append(items, &rem)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) MarkPaymentSent(ctx context.Context, id string, input model.ConfirmRemittanceInput, confirmedAt, paymentDate time.Time) error {
	var note *string
	if strings.TrimSpace(input.PaymentNote) != "" {
		n := strings.TrimSpace(input.PaymentNote)
		note = &n
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE tax_remittances
		SET status = $2,
			bank_payment_reference = $3,
			bank_payment_date = $4,
			payment_confirmed_at = $5,
			payment_note = $6
		WHERE id = $1
	`, id, model.StatusPaidUnreconciled, strings.TrimSpace(input.BankPaymentReference), paymentDate, confirmedAt, note)
	return err
}

func (r *PostgresRepository) MarkRemitted(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE tax_remittances SET status=$2, remitted_at=$3 WHERE id=$1
	`, id, model.StatusRemitted, time.Now().UTC())
	return err
}

type scannable interface {
	Scan(dest ...any) error
}

func scanRemittance(row scannable, rem *model.Remittance) error {
	return row.Scan(
		&rem.ID, &rem.Period, &rem.TotalAmount, &rem.BlnkTxnID, &rem.Status,
		&rem.BankPaymentReference, &rem.BankPaymentDate, &rem.PaymentConfirmedAt, &rem.PaymentNote,
		&rem.RemittedAt, &rem.CreatedAt,
	)
}
