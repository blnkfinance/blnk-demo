package whtcategories

import (
	"context"

	"github.com/blnk-demo/pay-recon/backend/internal/whtcategories/model"
)

type Repository interface {
	Create(ctx context.Context, c *model.Category) error
	ListActive(ctx context.Context) ([]*model.Category, error)
	GetByID(ctx context.Context, id string) (*model.Category, error)
	GetByCode(ctx context.Context, code string) (*model.Category, error)
	UpsertByCode(ctx context.Context, c *model.Category) error
}

type Service interface {
	List(ctx context.Context) ([]*model.Category, error)
	Create(ctx context.Context, input model.CreateCategoryInput) (*model.Category, error)
	GetByID(ctx context.Context, id string) (*model.Category, error)
}
