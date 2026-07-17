package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/admin"
	"github.com/blnk-demo/pay-recon/backend/internal/admin/model"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/id"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo admin.Repository
}

func New(repo admin.Repository) admin.Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, input model.CreateAdminInput) (*model.Admin, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	a := &model.Admin{
		ID:           id.New(),
		Email:        strings.ToLower(strings.TrimSpace(input.Email)),
		FirstName:    strings.TrimSpace(input.FirstName),
		LastName:     strings.TrimSpace(input.LastName),
		PasswordHash: string(hash),
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.repo.Create(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *Service) GetByID(ctx context.Context, id string) (*model.Admin, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, page, pageSize int) ([]*model.Admin, int64, error) {
	return s.repo.List(ctx, page, pageSize)
}

func (s *Service) HasAny(ctx context.Context) (bool, error) {
	count, err := s.repo.Count(ctx)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *Service) Bootstrap(ctx context.Context, input model.BootstrapInput) (*model.Admin, error) {
	hasAny, err := s.HasAny(ctx)
	if err != nil {
		return nil, err
	}
	if hasAny {
		return nil, fmt.Errorf("bootstrap already completed")
	}
	return s.Create(ctx, model.CreateAdminInput(input))
}
