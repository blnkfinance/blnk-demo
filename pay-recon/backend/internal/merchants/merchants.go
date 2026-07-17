package merchants

import (
	"context"

	"github.com/blnk-demo/pay-recon/backend/internal/merchants/model"
)

type Repository interface {
	Create(ctx context.Context, m *model.Merchant) error
	GetByID(ctx context.Context, id string) (*model.Merchant, error)
	List(ctx context.Context) ([]*model.Merchant, error)
	Update(ctx context.Context, m *model.Merchant) error
}

type Service interface {
	Create(ctx context.Context, input model.CreateMerchantInput) (*model.Merchant, error)
	GetByID(ctx context.Context, id string) (*model.Merchant, error)
	List(ctx context.Context) ([]*model.Merchant, error)
	Update(ctx context.Context, id string, input model.UpdateMerchantInput) (*model.Merchant, error)
}
