package wht

import (
	"context"

	"github.com/blnk-demo/pay-recon/backend/internal/wht/model"
)

type Repository interface {
	Create(ctx context.Context, rec *model.Record) error
	List(ctx context.Context, page, pageSize int) ([]*model.Record, int64, error)
}

type Service interface {
	List(ctx context.Context, page, pageSize int) ([]*model.Record, int64, error)
}
