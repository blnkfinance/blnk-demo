package auth

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/auth/model"
)

// Service defines authentication operations for both admin and customer actors.
type Service interface {
	LoginCustomer(ctx context.Context, input model.LoginInput) (*model.Session, error)
	LoginAdmin(ctx context.Context, input model.LoginInput) (*model.Session, error)
	ValidateToken(ctx context.Context, token string) (*model.Claims, error)
	RevokeToken(ctx context.Context, token string) error
}
