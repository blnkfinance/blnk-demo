package admin

import (
	"context"

	"github.com/blnk-demo/pay-recon/backend/internal/admin/model"
)

type Repository interface {
	Create(ctx context.Context, a *model.Admin) error
	GetByID(ctx context.Context, id string) (*model.Admin, error)
	GetByEmail(ctx context.Context, email string) (*model.Admin, error)
	Update(ctx context.Context, a *model.Admin) error
	List(ctx context.Context, page, pageSize int) ([]*model.Admin, int64, error)
	Count(ctx context.Context) (int64, error)
}

type Service interface {
	Create(ctx context.Context, input model.CreateAdminInput) (*model.Admin, error)
	Bootstrap(ctx context.Context, input model.BootstrapInput) (*model.Admin, error)
	GetByID(ctx context.Context, id string) (*model.Admin, error)
	List(ctx context.Context, page, pageSize int) ([]*model.Admin, int64, error)
	HasAny(ctx context.Context) (bool, error)
}
