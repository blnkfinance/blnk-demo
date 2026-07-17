package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/bills"
	"github.com/blnk-demo/pay-recon/backend/internal/bills/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgres(pool *pgxpool.Pool) bills.Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, b *model.Bill) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO bills (
			id, bill_reference, vendor_invoice_ref, merchant_id, wht_category_id, purpose,
			gross_amount, wht_rate, wht_amount, net_amount, currency,
			attachment_url, status, blnk_net_txn_id, blnk_wht_txn_id, created_by, created_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
	`, b.ID, b.BillReference, b.VendorInvoiceRef, b.MerchantID, b.WHTCategoryID, b.Purpose,
		b.GrossAmount, b.WHTRate, b.WHTAmount, b.NetAmount, b.Currency,
		b.AttachmentURL, b.Status, b.BlnkNetTxnID, b.BlnkWHTTxnID, b.CreatedBy, b.CreatedAt)
	return err
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.Bill, error) {
	row := r.pool.QueryRow(ctx, billSelect+" WHERE id = $1", id)
	return scanBill(row)
}

func (r *PostgresRepository) GetByReference(ctx context.Context, ref string) (*model.Bill, error) {
	row := r.pool.QueryRow(ctx, billSelect+" WHERE bill_reference = $1", ref)
	return scanBill(row)
}

func (r *PostgresRepository) GetByNetTxnID(ctx context.Context, txnID string) (*model.Bill, error) {
	row := r.pool.QueryRow(ctx, billSelect+" WHERE blnk_net_txn_id = $1", txnID)
	return scanBill(row)
}

func (r *PostgresRepository) List(ctx context.Context, filter model.ListFilter) ([]*model.Bill, error) {
	query := billSelect + " WHERE 1=1"
	args := []any{}
	i := 1
	if filter.Status != "" {
		query += fmt.Sprintf(" AND status = $%d", i)
		args = append(args, filter.Status)
		i++
	}
	if filter.MerchantID != "" {
		query += fmt.Sprintf(" AND merchant_id = $%d", i)
		args = append(args, filter.MerchantID)
		i++
	}
	query += " ORDER BY created_at DESC"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.Bill
	for rows.Next() {
		b, err := scanBill(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, b)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) MarkPaid(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE bills SET status = $2, paid_at = $3 WHERE id = $1
	`, id, model.StatusPaidReconciled, time.Now().UTC())
	return err
}

func (r *PostgresRepository) MarkPaymentSent(ctx context.Context, id string, input model.ConfirmPaymentInput, confirmedBy string, confirmedAt time.Time, paymentDate time.Time) error {
	var note *string
	if strings.TrimSpace(input.PaymentNote) != "" {
		n := strings.TrimSpace(input.PaymentNote)
		note = &n
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE bills
		SET status = $2,
			bank_payment_reference = $3,
			bank_payment_date = $4,
			payment_confirmed_at = $5,
			payment_confirmed_by = $6,
			payment_note = $7
		WHERE id = $1
	`, id, model.StatusPaidUnreconciled, strings.TrimSpace(input.BankPaymentReference), paymentDate, confirmedAt, confirmedBy, note)
	return err
}

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.pool.Exec(ctx, `UPDATE bills SET status = $2 WHERE id = $1`, id, status)
	return err
}

func (r *PostgresRepository) NextReferenceSeq(ctx context.Context, day time.Time) (int, error) {
	var seq int
	err := r.pool.QueryRow(ctx, `
		INSERT INTO bill_reference_counters (day, next_seq)
		VALUES ($1::date, 1)
		ON CONFLICT (day) DO UPDATE SET next_seq = bill_reference_counters.next_seq + 1
		RETURNING next_seq
	`, day).Scan(&seq)
	return seq, err
}

const billSelect = `
	SELECT id, bill_reference, vendor_invoice_ref, merchant_id, wht_category_id, purpose,
		gross_amount, wht_rate::text, wht_amount, net_amount, currency,
		attachment_url, status, bank_payment_reference, bank_payment_date, payment_confirmed_at,
		payment_confirmed_by, payment_note, blnk_net_txn_id, blnk_wht_txn_id, created_by, created_at, paid_at
	FROM bills`

type scannable interface {
	Scan(dest ...any) error
}

func scanBill(row scannable) (*model.Bill, error) {
	var b model.Bill
	if err := row.Scan(
		&b.ID, &b.BillReference, &b.VendorInvoiceRef, &b.MerchantID, &b.WHTCategoryID, &b.Purpose,
		&b.GrossAmount, &b.WHTRate, &b.WHTAmount, &b.NetAmount, &b.Currency,
		&b.AttachmentURL, &b.Status, &b.BankPaymentReference, &b.BankPaymentDate, &b.PaymentConfirmedAt,
		&b.PaymentConfirmedBy, &b.PaymentNote, &b.BlnkNetTxnID, &b.BlnkWHTTxnID, &b.CreatedBy, &b.CreatedAt, &b.PaidAt,
	); err != nil {
		return nil, fmt.Errorf("bill not found")
	}
	return &b, nil
}

func NormalizeReference(ref string) string {
	return strings.TrimSpace(ref)
}
