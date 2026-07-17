package service

import (
	"context"

	"github.com/blnk-demo/pay-recon/backend/internal/wht"
	"github.com/blnk-demo/pay-recon/backend/internal/wht/model"
)

type Service struct {
	repo wht.Repository
}

func New(repo wht.Repository) wht.Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, page, pageSize int) ([]*model.Record, int64, error) {
	return s.repo.List(ctx, page, pageSize)
}
