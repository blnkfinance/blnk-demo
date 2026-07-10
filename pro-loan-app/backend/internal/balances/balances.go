package balances

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/balances/model"
)

// Service defines operations for querying Blnk balances.
// Balances are read-only from the app's perspective; they are managed exclusively
// through Blnk transactions.
type Service interface {
	GetByID(ctx context.Context, balanceID string) (*model.Balance, error)
	ListByLoan(ctx context.Context, loanID string) ([]*model.Balance, error)
}
