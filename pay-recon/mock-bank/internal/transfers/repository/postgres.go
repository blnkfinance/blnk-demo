package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/mock-bank/internal/accounts"
	"github.com/blnk-demo/pay-recon/mock-bank/internal/transfers"
	"github.com/blnk-demo/pay-recon/mock-bank/internal/transfers/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool        *pgxpool.Pool
	accountRepo accounts.Repository
}

func NewPostgres(pool *pgxpool.Pool, accountRepo accounts.Repository) transfers.Repository {
	return &PostgresRepository{pool: pool, accountRepo: accountRepo}
}

func (r *PostgresRepository) Create(ctx context.Context, t *model.Transfer) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	from, err := r.accountRepo.GetByID(ctx, t.FromAccountID)
	if err != nil {
		return err
	}
	to, err := r.accountRepo.GetByID(ctx, t.ToAccountID)
	if err != nil {
		return err
	}
	if from.Balance < t.Amount {
		return transfers.ErrInsufficientFunds
	}

	if _, err := tx.Exec(ctx, `UPDATE bank_accounts SET balance = balance - $2 WHERE id = $1`, from.ID, t.Amount); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE bank_accounts SET balance = balance + $2 WHERE id = $1`, to.ID, t.Amount); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO bank_transactions (id, bank_transaction_id, from_account_id, to_account_id, amount, narration, transaction_date, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
	`, t.ID, t.BankTransactionID, t.FromAccountID, t.ToAccountID, t.Amount, t.Narration, t.TransactionDate, t.Status); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func NewTransfer(from, to string, amount int64, narration string) *model.Transfer {
	id := uuid.NewString()
	return &model.Transfer{
		ID:                id,
		BankTransactionID: generateBankTransactionID(),
		FromAccountID:     from,
		ToAccountID:       to,
		Amount:            amount,
		Narration:         narration,
		TransactionDate:   time.Now().UTC(),
		Status:            "completed",
	}
}

func generateBankTransactionID() string {
	now := time.Now().UTC()
	suffix := strings.ToUpper(strings.ReplaceAll(uuid.NewString()[:8], "-", ""))
	return fmt.Sprintf("BNK-%s-%s", now.Format("20060102"), suffix)
}
