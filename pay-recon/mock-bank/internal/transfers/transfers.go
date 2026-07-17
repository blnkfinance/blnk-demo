package transfers

import (
	"context"
	"errors"

	"github.com/blnk-demo/pay-recon/mock-bank/internal/transfers/model"
)

var ErrInsufficientFunds = errors.New("insufficient funds")

type Repository interface {
	Create(ctx context.Context, t *model.Transfer) error
}

type Service interface {
	Request(ctx context.Context, input model.RequestTransferInput) (*model.Transfer, error)
}
