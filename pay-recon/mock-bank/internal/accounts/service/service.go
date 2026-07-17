package service

import (
	"context"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/mock-bank/internal/accounts"
	"github.com/blnk-demo/pay-recon/mock-bank/internal/accounts/model"
	"github.com/google/uuid"
)

type Service struct {
	repo accounts.Repository
}

func New(repo accounts.Repository) accounts.Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, input model.CreateAccountInput) (*model.Account, error) {
	accountType := strings.TrimSpace(input.AccountType)
	if accountType == "" {
		accountType = "beneficiary"
	}
	a := &model.Account{
		ID:            uuid.NewString(),
		AccountNumber: strings.TrimSpace(input.AccountNumber),
		AccountName:   strings.TrimSpace(input.AccountName),
		Balance:       0,
		AccountType:   accountType,
		CreatedAt:     time.Now().UTC(),
	}
	if err := s.repo.Create(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *Service) FundOperating(ctx context.Context, input model.FundAccountInput) (*model.Account, error) {
	if input.Amount <= 0 {
		return nil, accounts.ErrInvalidAmount
	}
	return s.repo.FundOperating(ctx, input.Amount, strings.TrimSpace(input.Reference))
}

func (s *Service) GetByID(ctx context.Context, id string) (*model.Account, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GetOperating(ctx context.Context) (*model.Account, error) {
	return s.repo.GetOperating(ctx)
}

func (s *Service) List(ctx context.Context) ([]*model.Account, error) {
	return s.repo.List(ctx)
}
