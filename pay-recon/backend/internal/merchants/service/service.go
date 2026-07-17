package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/blnk"
	"github.com/blnk-demo/pay-recon/backend/internal/config"
	"github.com/blnk-demo/pay-recon/backend/internal/merchants"
	"github.com/blnk-demo/pay-recon/backend/internal/merchants/model"
	"github.com/google/uuid"
)

type Service struct {
	repo   merchants.Repository
	blnkCl *blnk.Client
	cfg    config.Config
	ledger func(ctx context.Context) (string, error)
}

func New(repo merchants.Repository, blnkCl *blnk.Client, cfg config.Config, ledgerID func(ctx context.Context) (string, error)) merchants.Service {
	return &Service{repo: repo, blnkCl: blnkCl, cfg: cfg, ledger: ledgerID}
}

func (s *Service) Create(ctx context.Context, input model.CreateMerchantInput) (*model.Merchant, error) {
	ledgerID, err := s.ledger(ctx)
	if err != nil {
		return nil, err
	}

	name := strings.TrimSpace(input.Name)
	identity, err := s.blnkCl.CreateIdentity(ctx, blnk.CreateIdentityRequest{
		IdentityType:     "organization",
		OrganizationName: name,
		MetaData:         map[string]any{"merchant": true},
	})
	if err != nil {
		return nil, fmt.Errorf("create blnk identity: %w", err)
	}

	balance, err := s.blnkCl.CreateBalance(ctx, blnk.CreateBalanceRequest{
		LedgerID:   ledgerID,
		IdentityID: identity.IdentityID,
		Currency:   s.cfg.DefaultCurrency,
		MetaData:   map[string]any{"type": "merchant"},
	})
	if err != nil {
		return nil, fmt.Errorf("create blnk balance: %w", err)
	}

	tin := strings.TrimSpace(input.TIN)
	var tinPtr *string
	if tin != "" {
		tinPtr = &tin
	}
	identityID := identity.IdentityID

	m := &model.Merchant{
		ID:                uuid.NewString(),
		Name:              name,
		TIN:               tinPtr,
		BankAccountNumber: strings.TrimSpace(input.BankAccountNumber),
		BankName:          strings.TrimSpace(input.BankName),
		BlnkBalanceID:     balance.BalanceID,
		BlnkIdentityID:    &identityID,
		Status:            model.StatusActive,
		CreatedAt:         time.Now().UTC(),
	}

	if err := s.repo.Create(ctx, m); err != nil {
		return nil, err
	}
	return m, nil
}

func (s *Service) GetByID(ctx context.Context, id string) (*model.Merchant, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context) ([]*model.Merchant, error) {
	return s.repo.List(ctx)
}

func (s *Service) Update(ctx context.Context, id string, input model.UpdateMerchantInput) (*model.Merchant, error) {
	m, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if input.Name != nil {
		m.Name = strings.TrimSpace(*input.Name)
	}
	if input.TIN != nil {
		tin := strings.TrimSpace(*input.TIN)
		if tin == "" {
			m.TIN = nil
		} else {
			m.TIN = &tin
		}
	}
	if input.BankAccountNumber != nil {
		m.BankAccountNumber = strings.TrimSpace(*input.BankAccountNumber)
	}
	if input.BankName != nil {
		m.BankName = strings.TrimSpace(*input.BankName)
	}
	if input.Status != nil {
		m.Status = *input.Status
	}
	if err := s.repo.Update(ctx, m); err != nil {
		return nil, err
	}
	return m, nil
}
