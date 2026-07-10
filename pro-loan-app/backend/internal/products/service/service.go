package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/id"
	"github.com/blnk-demo/pro-loan-app/backend/internal/products"
	"github.com/blnk-demo/pro-loan-app/backend/internal/products/model"
)

type productService struct {
	repo products.Repository
}

func New(repo products.Repository) products.Service {
	return &productService{repo: repo}
}

func (s *productService) Create(ctx context.Context, input model.CreateProductInput) (*model.Product, error) {
	currency := strings.ToUpper(strings.TrimSpace(input.Currency))
	if currency == "" {
		return nil, fmt.Errorf("currency is required")
	}

	if input.RepaymentFrequency == "" {
		input.RepaymentFrequency = model.FrequencyMonthly
	}

	now := time.Now().UTC()
	p := &model.Product{
		ID:                 newID(),
		Name:               input.Name,
		Currency:           currency,
		PrincipalMinCents:  input.PrincipalMinCents,
		PrincipalMaxCents:  input.PrincipalMaxCents,
		AnnualInterestBps:  input.AnnualInterestBps,
		TermMonths:         input.TermMonths,
		OriginationFeeBps:  input.OriginationFeeBps,
		RepaymentFrequency: input.RepaymentFrequency,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := s.repo.Create(ctx, p); err != nil {
		return nil, fmt.Errorf("create product: %w", err)
	}

	return p, nil
}

func (s *productService) GetByID(ctx context.Context, id string) (*model.Product, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *productService) Update(ctx context.Context, id string, input model.UpdateProductInput) (*model.Product, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		p.Name = *input.Name
	}
	if input.AnnualInterestBps != nil {
		p.AnnualInterestBps = *input.AnnualInterestBps
	}
	if input.OriginationFeeBps != nil {
		p.OriginationFeeBps = *input.OriginationFeeBps
	}
	if input.PrincipalMinCents != nil {
		p.PrincipalMinCents = *input.PrincipalMinCents
	}
	if input.PrincipalMaxCents != nil {
		p.PrincipalMaxCents = *input.PrincipalMaxCents
	}
	if input.RepaymentFrequency != nil {
		p.RepaymentFrequency = *input.RepaymentFrequency
	}

	p.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, p); err != nil {
		return nil, fmt.Errorf("update product: %w", err)
	}

	return p, nil
}

func (s *productService) List(ctx context.Context, includeArchived bool) ([]*model.Product, error) {
	return s.repo.List(ctx, includeArchived)
}

func (s *productService) Archive(ctx context.Context, id string) (*model.Product, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	p.Archived = true
	p.ArchivedAt = &now
	p.UpdatedAt = now

	if err := s.repo.Update(ctx, p); err != nil {
		return nil, fmt.Errorf("archive product: %w", err)
	}

	return p, nil
}

func (s *productService) Unarchive(ctx context.Context, id string) (*model.Product, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	p.Archived = false
	p.ArchivedAt = nil
	p.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, p); err != nil {
		return nil, fmt.Errorf("unarchive product: %w", err)
	}

	return p, nil
}

func newID() string {
	return id.New()
}
