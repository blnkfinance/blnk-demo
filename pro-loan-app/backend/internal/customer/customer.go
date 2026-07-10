package customer

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/customer/model"
)

// Repository defines persistence operations for customers.
type Repository interface {
	Create(ctx context.Context, c *model.Customer) error
	GetByID(ctx context.Context, id string) (*model.Customer, error)
	GetByEmail(ctx context.Context, email string) (*model.Customer, error)
	Update(ctx context.Context, c *model.Customer) error
	List(ctx context.Context, page, pageSize int) ([]*model.Customer, int64, error)
}

// WalletBalanceEntry is a single currency wallet balance.
type WalletBalanceEntry struct {
	Currency     string `json:"currency"`
	BalanceCents int64  `json:"balance_cents"`
}

// CustomerWithBalance extends Customer with wallet balances from Blnk.
type CustomerWithBalance struct {
	*model.Customer
	WalletBalances []WalletBalanceEntry `json:"wallet_balances"`
	WalletBalance  *int64               `json:"wallet_balance,omitempty"` // legacy primary (NGN)
}

// Service defines business operations for customers.
type Service interface {
	Register(ctx context.Context, input model.CreateCustomerInput) (*model.Customer, error)
	GetByID(ctx context.Context, id string) (*model.Customer, error)
	GetByEmail(ctx context.Context, email string) (*model.Customer, error)
	List(ctx context.Context, page, pageSize int) ([]*model.Customer, int64, error)
	SyncBlnkIdentity(ctx context.Context, customerID string) (*model.Customer, error)
	GetMe(ctx context.Context, customerID string) (*CustomerWithBalance, error)
	EnsureWalletBalance(ctx context.Context, customerID, currency string) (string, error)
	EnsureLoanReceivableBalance(ctx context.Context, customerID, currency string) (string, error)
}
