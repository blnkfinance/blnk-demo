package admin

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/admin/model"
)

// Repository defines persistence operations for admin users.
type Repository interface {
	Create(ctx context.Context, a *model.Admin) error
	GetByID(ctx context.Context, id string) (*model.Admin, error)
	GetByEmail(ctx context.Context, email string) (*model.Admin, error)
	Update(ctx context.Context, a *model.Admin) error
	List(ctx context.Context, page, pageSize int) ([]*model.Admin, int64, error)
	Count(ctx context.Context) (int64, error)
}

// Service defines business operations for admin users.
type Service interface {
	Create(ctx context.Context, input model.CreateAdminInput) (*model.Admin, error)
	GetByID(ctx context.Context, id string) (*model.Admin, error)
	GetByEmail(ctx context.Context, email string) (*model.Admin, error)
	List(ctx context.Context, page, pageSize int) ([]*model.Admin, int64, error)
	Update(ctx context.Context, id string, input model.UpdateAdminInput) (*model.Admin, error)
	// HasAny reports whether at least one admin exists in the database.
	// Used to gate the public bootstrap endpoint.
	HasAny(ctx context.Context) (bool, error)
}
