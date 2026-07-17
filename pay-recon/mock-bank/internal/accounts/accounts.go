package accounts

import (
	"context"
	"errors"

	"github.com/blnk-demo/pay-recon/mock-bank/internal/accounts/model"
)

var ErrInvalidAmount = errors.New("invalid amount")

type Repository interface {
	Create(ctx context.Context, a *model.Account) error
	GetByID(ctx context.Context, id string) (*model.Account, error)
	GetOperating(ctx context.Context) (*model.Account, error)
	List(ctx context.Context) ([]*model.Account, error)
	FundOperating(ctx context.Context, amount int64, reference string) (*model.Account, error)
	UpdateBalance(ctx context.Context, id string, balance int64) error
}

type Service interface {
	Create(ctx context.Context, input model.CreateAccountInput) (*model.Account, error)
	GetByID(ctx context.Context, id string) (*model.Account, error)
	GetOperating(ctx context.Context) (*model.Account, error)
	List(ctx context.Context) ([]*model.Account, error)
	FundOperating(ctx context.Context, input model.FundAccountInput) (*model.Account, error)
}
