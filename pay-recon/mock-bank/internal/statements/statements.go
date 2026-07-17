package statements

import (
	"context"
	"io"
	"time"
)

type Line struct {
	Date               time.Time `json:"date"`
	TransactionID      string    `json:"transaction_id"`
	Narration          string    `json:"narration"`
	BeneficiaryAccount string    `json:"beneficiary_account"`
	Debit              int64     `json:"debit"`
	Credit             int64     `json:"credit"`
	Balance            int64     `json:"balance"`
}

type Repository interface {
	ListDebits(ctx context.Context, accountID string, from, to time.Time) ([]Line, error)
}

type Service interface {
	List(ctx context.Context, accountID string, from, to time.Time) ([]Line, error)
	ExportCSV(ctx context.Context, accountID string, from, to time.Time, w io.Writer) error
}
