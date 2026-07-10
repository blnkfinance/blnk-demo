package wallet

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/wallet/model"
)

type Repository interface {
	Create(ctx context.Context, tx *model.WalletTransaction) error
	GetByID(ctx context.Context, id string) (*model.WalletTransaction, error)
	GetByReference(ctx context.Context, reference string) (*model.WalletTransaction, error)
	ListByCustomer(ctx context.Context, customerID string, page, pageSize int) ([]*model.WalletTransaction, int64, error)
}

type Service interface {
	Record(ctx context.Context, input model.RecordInput) (*model.WalletTransaction, error)
	Get(ctx context.Context, customerID, txID string) (*model.WalletTransaction, error)
	List(ctx context.Context, customerID string, page, pageSize int) ([]*model.WalletTransaction, int64, error)
	Transfer(ctx context.Context, senderID string, input model.TransferInput) (*model.TransferResult, error)
	TransferFeeConfig(ctx context.Context, currency string, external bool) (model.TransferFees, error)
}
