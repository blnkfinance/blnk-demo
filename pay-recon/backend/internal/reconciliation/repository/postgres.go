package repository

import (
	"context"
	"fmt"

	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation"
	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgres(pool *pgxpool.Pool) reconciliation.Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateUpload(ctx context.Context, u *model.StatementUpload) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO statement_uploads (
			id, blnk_upload_id, source, cadence, record_count, rows_read, rows_imported, rows_skipped, uploaded_by, uploaded_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
	`, u.ID, u.BlnkUploadID, u.Source, u.Cadence, u.RecordCount, u.RowsRead, u.RowsImported, u.RowsSkipped, u.UploadedBy, u.UploadedAt)
	return err
}

func (r *PostgresRepository) GetUpload(ctx context.Context, id string) (*model.StatementUpload, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, blnk_upload_id, source, cadence, record_count, rows_read, rows_imported, rows_skipped, uploaded_by, uploaded_at
		FROM statement_uploads WHERE id = $1
	`, id)
	var u model.StatementUpload
	if err := row.Scan(
		&u.ID, &u.BlnkUploadID, &u.Source, &u.Cadence, &u.RecordCount, &u.RowsRead, &u.RowsImported, &u.RowsSkipped, &u.UploadedBy, &u.UploadedAt,
	); err != nil {
		return nil, fmt.Errorf("upload not found")
	}
	return &u, nil
}

func (r *PostgresRepository) CreateRun(ctx context.Context, run *model.Run) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO reconciliation_runs (id, blnk_reconciliation_id, statement_upload_id, strategy, matched_count, unmatched_count, status, started_at, completed_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
	`, run.ID, run.BlnkReconciliationID, run.StatementUploadID, run.Strategy, run.MatchedCount, run.UnmatchedCount, run.Status, run.StartedAt, run.CompletedAt)
	return err
}

func (r *PostgresRepository) UpdateRun(ctx context.Context, run *model.Run) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE reconciliation_runs SET matched_count=$2, unmatched_count=$3, status=$4, completed_at=$5
		WHERE id=$1
	`, run.ID, run.MatchedCount, run.UnmatchedCount, run.Status, run.CompletedAt)
	return err
}

func (r *PostgresRepository) GetRun(ctx context.Context, id string) (*model.Run, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, blnk_reconciliation_id, statement_upload_id, strategy, matched_count, unmatched_count, status, started_at, completed_at
		FROM reconciliation_runs WHERE id = $1
	`, id)
	var run model.Run
	if err := row.Scan(&run.ID, &run.BlnkReconciliationID, &run.StatementUploadID, &run.Strategy, &run.MatchedCount, &run.UnmatchedCount, &run.Status, &run.StartedAt, &run.CompletedAt); err != nil {
		return nil, fmt.Errorf("run not found")
	}
	return &run, nil
}

func (r *PostgresRepository) ListRuns(ctx context.Context) ([]*model.Run, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, blnk_reconciliation_id, statement_upload_id, strategy, matched_count, unmatched_count, status, started_at, completed_at
		FROM reconciliation_runs ORDER BY started_at DESC LIMIT 50
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.Run
	for rows.Next() {
		var run model.Run
		if err := rows.Scan(&run.ID, &run.BlnkReconciliationID, &run.StatementUploadID, &run.Strategy, &run.MatchedCount, &run.UnmatchedCount, &run.Status, &run.StartedAt, &run.CompletedAt); err != nil {
			return nil, err
		}
		items = append(items, &run)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) CreateException(ctx context.Context, e *model.Exception) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO reconciliation_exceptions (id, reconciliation_run_id, exception_type, bill_id, external_record, resolved, resolution_note, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
	`, e.ID, e.ReconciliationRunID, e.ExceptionType, e.BillID, e.ExternalRecord, e.Resolved, e.ResolutionNote, e.CreatedAt)
	return err
}

func (r *PostgresRepository) ListExceptions(ctx context.Context, runID string) ([]*model.Exception, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, reconciliation_run_id, exception_type, bill_id, external_record, resolved, resolution_note, created_at
		FROM reconciliation_exceptions WHERE reconciliation_run_id = $1 ORDER BY created_at
	`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.Exception
	for rows.Next() {
		var e model.Exception
		if err := rows.Scan(&e.ID, &e.ReconciliationRunID, &e.ExceptionType, &e.BillID, &e.ExternalRecord, &e.Resolved, &e.ResolutionNote, &e.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, &e)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) GetException(ctx context.Context, id string) (*model.Exception, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, reconciliation_run_id, exception_type, bill_id, external_record, resolved, resolution_note, created_at
		FROM reconciliation_exceptions WHERE id = $1
	`, id)
	var e model.Exception
	if err := row.Scan(&e.ID, &e.ReconciliationRunID, &e.ExceptionType, &e.BillID, &e.ExternalRecord, &e.Resolved, &e.ResolutionNote, &e.CreatedAt); err != nil {
		return nil, fmt.Errorf("exception not found")
	}
	return &e, nil
}

func (r *PostgresRepository) ResolveException(ctx context.Context, id, note string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE reconciliation_exceptions SET resolved=true, resolution_note=$2 WHERE id=$1
	`, id, note)
	return err
}

func (r *PostgresRepository) ListAwaitingPaymentBills(ctx context.Context) ([]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT id FROM bills WHERE status = 'paid_unreconciled'`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *PostgresRepository) FindExistingDedupeKeys(ctx context.Context, keys []string) (map[string]bool, error) {
	out := make(map[string]bool)
	if len(keys) == 0 {
		return out, nil
	}
	rows, err := r.pool.Query(ctx, `
		SELECT dedupe_key FROM statement_lines WHERE dedupe_key = ANY($1)
	`, keys)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, err
		}
		out[key] = true
	}
	return out, rows.Err()
}

func (r *PostgresRepository) CreateStatementLines(ctx context.Context, uploadID string, lines []*model.StatementLine) error {
	for _, line := range lines {
		_, err := r.pool.Exec(ctx, `
		INSERT INTO statement_lines (
			id, upload_id, dedupe_key, transaction_id, narration, beneficiary_account,
			debit, credit, balance, line_date, matched_bill_id, matched_remittance_id, ledger_synced, created_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		ON CONFLICT (dedupe_key) DO NOTHING
	`, line.ID, uploadID, line.DedupeKey, line.TransactionID, line.Narration, line.BeneficiaryAccount,
			line.Debit, line.Credit, line.Balance, line.LineDate, line.MatchedBillID, line.MatchedRemittanceID, line.LedgerSynced, line.CreatedAt)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *PostgresRepository) ListUnmatchedLinesByUpload(ctx context.Context, uploadID string) ([]*model.StatementLine, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, upload_id, transaction_id, narration, beneficiary_account,
			debit, credit, balance, line_date, matched_bill_id, matched_remittance_id, ledger_synced, created_at
		FROM statement_lines
		WHERE upload_id = $1 AND matched_bill_id IS NULL AND matched_remittance_id IS NULL AND debit > 0
		ORDER BY line_date ASC
	`, uploadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.StatementLine
	for rows.Next() {
		var line model.StatementLine
		if err := rows.Scan(
			&line.ID, &line.UploadID, &line.TransactionID, &line.Narration, &line.BeneficiaryAccount,
			&line.Debit, &line.Credit, &line.Balance, &line.LineDate, &line.MatchedBillID, &line.MatchedRemittanceID, &line.LedgerSynced, &line.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, &line)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) MarkLineMatched(ctx context.Context, lineID, billID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE statement_lines SET matched_bill_id = $2 WHERE id = $1
	`, lineID, billID)
	return err
}

func (r *PostgresRepository) MarkLineMatchedRemittance(ctx context.Context, lineID, remittanceID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE statement_lines SET matched_remittance_id = $2 WHERE id = $1
	`, lineID, remittanceID)
	return err
}

func (r *PostgresRepository) ListUnsyncedCreditLines(ctx context.Context, uploadID string) ([]*model.StatementLine, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, upload_id, transaction_id, narration, beneficiary_account,
			debit, credit, balance, line_date, matched_bill_id, matched_remittance_id, ledger_synced, created_at
		FROM statement_lines
		WHERE upload_id = $1 AND credit > 0 AND ledger_synced = false
		ORDER BY line_date ASC
	`, uploadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.StatementLine
	for rows.Next() {
		var line model.StatementLine
		if err := rows.Scan(
			&line.ID, &line.UploadID, &line.TransactionID, &line.Narration, &line.BeneficiaryAccount,
			&line.Debit, &line.Credit, &line.Balance, &line.LineDate, &line.MatchedBillID, &line.MatchedRemittanceID, &line.LedgerSynced, &line.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, &line)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) CountSyncedCredits(ctx context.Context, uploadID string) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM statement_lines
		WHERE upload_id = $1 AND credit > 0 AND ledger_synced = true
	`, uploadID).Scan(&n)
	return n, err
}

func (r *PostgresRepository) MarkLineLedgerSynced(ctx context.Context, lineID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE statement_lines SET ledger_synced = true WHERE id = $1
	`, lineID)
	return err
}
