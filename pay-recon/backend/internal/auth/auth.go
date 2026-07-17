package auth

import (
	"context"

	"github.com/blnk-demo/pay-recon/backend/internal/auth/model"
)

type Service interface {
	LoginAdmin(ctx context.Context, input model.LoginInput) (*model.Session, error)
	ValidateToken(ctx context.Context, token string) (*model.Claims, error)
}
