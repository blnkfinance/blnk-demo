package service

import (
	"context"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/whtcategories"
	"github.com/blnk-demo/pay-recon/backend/internal/whtcategories/model"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type Service struct {
	repo whtcategories.Repository
}

func New(repo whtcategories.Repository) whtcategories.Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context) ([]*model.Category, error) {
	return s.repo.ListActive(ctx)
}

func (s *Service) Create(ctx context.Context, input model.CreateCategoryInput) (*model.Category, error) {
	effective := time.Now().UTC()
	if input.EffectiveFrom != "" {
		if t, err := time.Parse("2006-01-02", input.EffectiveFrom); err == nil {
			effective = t
		}
	}
	c := &model.Category{
		ID:            uuid.NewString(),
		Code:          strings.TrimSpace(input.Code),
		Label:         strings.TrimSpace(input.Label),
		Rate:          decimal.NewFromFloat(input.Rate),
		Active:        true,
		EffectiveFrom: effective,
	}
	if err := s.repo.UpsertByCode(ctx, c); err != nil {
		return nil, err
	}
	return s.repo.GetByCode(ctx, c.Code)
}

func (s *Service) GetByID(ctx context.Context, id string) (*model.Category, error) {
	return s.repo.GetByID(ctx, id)
}

// SeedDefaults inserts standard Nigerian WHT categories if missing.
func SeedDefaults(ctx context.Context, repo whtcategories.Repository) error {
	defaults := []struct {
		code  string
		label string
		rate  string
	}{
		{"goods", "Goods", "0.0500"},
		{"services", "Services", "0.1000"},
	}
	for _, d := range defaults {
		rate, _ := decimal.NewFromString(d.rate)
		if err := repo.UpsertByCode(ctx, &model.Category{
			ID:            uuid.NewString(),
			Code:          d.code,
			Label:         d.label,
			Rate:          rate,
			Active:        true,
			EffectiveFrom: time.Now().UTC(),
		}); err != nil {
			return err
		}
	}
	return nil
}
