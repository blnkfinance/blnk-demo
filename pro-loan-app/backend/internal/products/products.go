package products

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/products/model"
)

// Repository defines persistence operations for loan products.
type Repository interface {
	Create(ctx context.Context, p *model.Product) error
	GetByID(ctx context.Context, id string) (*model.Product, error)
	Update(ctx context.Context, p *model.Product) error
	List(ctx context.Context, includeArchived bool) ([]*model.Product, error)
}

// Service defines business operations for loan products.
type Service interface {
	Create(ctx context.Context, input model.CreateProductInput) (*model.Product, error)
	GetByID(ctx context.Context, id string) (*model.Product, error)
	Update(ctx context.Context, id string, input model.UpdateProductInput) (*model.Product, error)
	List(ctx context.Context, includeArchived bool) ([]*model.Product, error)
	Archive(ctx context.Context, id string) (*model.Product, error)
	Unarchive(ctx context.Context, id string) (*model.Product, error)
}
