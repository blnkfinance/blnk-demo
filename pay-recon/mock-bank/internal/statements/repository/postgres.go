package repository

import (
	"context"
	"time"

	"github.com/blnk-demo/pay-recon/mock-bank/internal/statements"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgres(pool *pgxpool.Pool) statements.Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) ListDebits(ctx context.Context, accountID string, from, to time.Time) ([]statements.Line, error) {
	opening, err := r.BalanceBefore(ctx, accountID, from)
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT
			bt.transaction_date,
			bt.bank_transaction_id,
			bt.narration,
			COALESCE(to_acct.account_number, ''),
			CASE WHEN bt.from_account_id = $1 THEN bt.amount ELSE 0 END AS debit,
			CASE WHEN bt.to_account_id = $1 THEN bt.amount ELSE 0 END AS credit
		FROM bank_transactions bt
		LEFT JOIN bank_accounts to_acct ON to_acct.id = bt.to_account_id
		WHERE (bt.from_account_id = $1 OR bt.to_account_id = $1) AND bt.transaction_date::date BETWEEN $2 AND $3
		ORDER BY bt.transaction_date ASC, bt.bank_transaction_id ASC
	`, accountID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	running := opening
	var lines []statements.Line
	for rows.Next() {
		var l statements.Line
		if err := rows.Scan(&l.Date, &l.TransactionID, &l.Narration, &l.BeneficiaryAccount, &l.Debit, &l.Credit); err != nil {
			return nil, err
		}
		running = running - l.Debit + l.Credit
		l.Balance = running
		lines = append(lines, l)
	}
	return lines, rows.Err()
}

// BalanceBefore returns the account balance at the start of the day `from`
// (sum of all prior debits/credits from a zero opening).
func (r *PostgresRepository) BalanceBefore(ctx context.Context, accountID string, from time.Time) (int64, error) {
	var balance int64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(
			CASE
				WHEN bt.to_account_id = $1 THEN bt.amount
				WHEN bt.from_account_id = $1 THEN -bt.amount
				ELSE 0
			END
		), 0)
		FROM bank_transactions bt
		WHERE (bt.from_account_id = $1 OR bt.to_account_id = $1)
		  AND bt.transaction_date::date < $2
	`, accountID, from).Scan(&balance)
	return balance, err
}
