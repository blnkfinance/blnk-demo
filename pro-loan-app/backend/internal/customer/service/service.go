package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/blnk"
	"github.com/blnk-demo/pro-loan-app/backend/internal/customer"
	"github.com/blnk-demo/pro-loan-app/backend/internal/customer/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/id"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/settings"
	"golang.org/x/crypto/bcrypt"
)

type customerService struct {
	repo         customer.Repository
	blnkCl       *blnk.Client
	settingsRepo *settings.Repository
}

func New(repo customer.Repository, blnkCl *blnk.Client, settingsRepo *settings.Repository) customer.Service {
	return &customerService{repo: repo, blnkCl: blnkCl, settingsRepo: settingsRepo}
}

func (s *customerService) Register(ctx context.Context, input model.CreateCustomerInput) (*model.Customer, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	now := time.Now().UTC()
	c := &model.Customer{
		ID:           id.New(),
		FirstName:    input.FirstName,
		LastName:     input.LastName,
		Email:        input.Email,
		Phone:        input.Phone,
		PasswordHash: string(hash),
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.repo.Create(ctx, c); err != nil {
		return nil, fmt.Errorf("create customer: %w", err)
	}

	blnkID, err := s.createBlnkIdentity(ctx, c)
	if err != nil {
		slog.Warn("blnk identity creation failed during signup; customer saved without identity",
			"customer_id", c.ID, "err", err)
		return c, nil
	}

	c.BlnkIdentityID = blnkID
	c.UpdatedAt = time.Now().UTC()
	if err := s.repo.Update(ctx, c); err != nil {
		slog.Warn("failed to persist blnk identity after signup",
			"customer_id", c.ID, "blnk_identity_id", blnkID, "err", err)
		return c, nil
	}

	if _, err := s.EnsureWalletBalance(ctx, c.ID, model.DefaultCurrency); err != nil {
		slog.Warn("wallet balance creation failed during signup; customer saved without wallet",
			"customer_id", c.ID, "err", err)
	}

	return c, nil
}

func (s *customerService) GetByID(ctx context.Context, customerID string) (*model.Customer, error) {
	c, err := s.repo.GetByID(ctx, customerID)
	if err != nil {
		return nil, err
	}
	c.Normalize()
	return c, nil
}

func (s *customerService) GetByEmail(ctx context.Context, email string) (*model.Customer, error) {
	c, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	c.Normalize()
	return c, nil
}

func (s *customerService) List(ctx context.Context, page, pageSize int) ([]*model.Customer, int64, error) {
	items, total, err := s.repo.List(ctx, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	for _, c := range items {
		c.Normalize()
	}
	return items, total, nil
}

func (s *customerService) GetMe(ctx context.Context, customerID string) (*customer.CustomerWithBalance, error) {
	if _, err := s.EnsureWalletBalance(ctx, customerID, model.DefaultCurrency); err != nil {
		return nil, err
	}

	c, err := s.repo.GetByID(ctx, customerID)
	if err != nil {
		return nil, err
	}
	c.Normalize()

	var entries []customer.WalletBalanceEntry
	var legacyNGN *int64

	for currency, balanceID := range c.WalletBalanceIDs {
		if balanceID == "" {
			continue
		}
		b, err := s.blnkCl.GetBalance(ctx, balanceID)
		if err != nil {
			slog.Warn("failed to fetch wallet balance from Blnk",
				"customer_id", customerID, "currency", currency, "err", err)
			continue
		}
		entries = append(entries, customer.WalletBalanceEntry{
			Currency:     currency,
			BalanceCents: b.BalanceMinorUnits(),
		})
		if currency == model.DefaultCurrency {
			bal := b.BalanceMinorUnits()
			legacyNGN = &bal
		}
	}

	return &customer.CustomerWithBalance{
		Customer:       c,
		WalletBalances: entries,
		WalletBalance:  legacyNGN,
	}, nil
}

func (s *customerService) EnsureWalletBalance(ctx context.Context, customerID, currency string) (string, error) {
	c, err := s.repo.GetByID(ctx, customerID)
	if err != nil {
		return "", fmt.Errorf("get customer: %w", err)
	}
	c.Normalize()

	if balanceID := c.WalletBalanceFor(currency); balanceID != "" {
		return balanceID, nil
	}

	if c.BlnkIdentityID == "" {
		return "", fmt.Errorf("customer %s has no Blnk identity", c.ID)
	}

	plat, err := s.settingsRepo.Get(ctx)
	if err != nil {
		return "", fmt.Errorf("load platform settings: %w", err)
	}
	if plat.WalletLedgerID == "" {
		return "", fmt.Errorf("wallet ledger not bootstrapped")
	}

	bal, err := s.blnkCl.CreateBalance(ctx, blnk.CreateBalanceRequest{
		LedgerID:   plat.WalletLedgerID,
		IdentityID: c.BlnkIdentityID,
		Currency:   currency,
		MetaData:   map[string]any{"app_customer_id": c.ID, "type": "wallet"},
	})
	if err != nil {
		return "", fmt.Errorf("create wallet balance in Blnk: %w", err)
	}

	c.SetWalletBalance(currency, bal.BalanceID)
	if currency == model.DefaultCurrency {
		c.WalletBalanceID = bal.BalanceID
	}
	c.UpdatedAt = time.Now().UTC()
	if err := s.repo.Update(ctx, c); err != nil {
		return "", fmt.Errorf("save wallet balance ID on customer: %w", err)
	}

	slog.Info("created customer wallet balance", "customer_id", c.ID, "currency", currency, "balance_id", bal.BalanceID)
	return bal.BalanceID, nil
}

func (s *customerService) EnsureLoanReceivableBalance(ctx context.Context, customerID, currency string) (string, error) {
	c, err := s.repo.GetByID(ctx, customerID)
	if err != nil {
		return "", fmt.Errorf("get customer: %w", err)
	}
	c.Normalize()

	if balanceID := c.LoanReceivableBalanceFor(currency); balanceID != "" {
		return balanceID, nil
	}

	if c.BlnkIdentityID == "" {
		return "", fmt.Errorf("customer %s has no Blnk identity", c.ID)
	}

	plat, err := s.settingsRepo.Get(ctx)
	if err != nil {
		return "", fmt.Errorf("load platform settings: %w", err)
	}
	if plat.ReceivableLedgerID == "" {
		return "", fmt.Errorf("receivable ledger not bootstrapped")
	}

	bal, err := s.blnkCl.CreateBalance(ctx, blnk.CreateBalanceRequest{
		LedgerID:   plat.ReceivableLedgerID,
		IdentityID: c.BlnkIdentityID,
		Currency:   currency,
		MetaData:   map[string]any{
			"app_customer_id": c.ID,
			"type":            "loan_receivable",
		},
	})
	if err != nil {
		return "", fmt.Errorf("create loan receivable balance in Blnk: %w", err)
	}

	c.SetLoanReceivableBalance(currency, bal.BalanceID)
	c.UpdatedAt = time.Now().UTC()
	if err := s.repo.Update(ctx, c); err != nil {
		return "", fmt.Errorf("save loan receivable balance ID on customer: %w", err)
	}

	slog.Info("created customer loan receivable balance",
		"customer_id", c.ID, "currency", currency, "balance_id", bal.BalanceID)
	return bal.BalanceID, nil
}

func (s *customerService) SyncBlnkIdentity(ctx context.Context, customerID string) (*model.Customer, error) {
	c, err := s.repo.GetByID(ctx, customerID)
	if err != nil {
		return nil, err
	}

	if c.BlnkIdentityID != "" {
		c.Normalize()
		return c, nil
	}

	blnkID, err := s.createBlnkIdentity(ctx, c)
	if err != nil {
		return nil, fmt.Errorf("create blnk identity: %w", err)
	}

	c.BlnkIdentityID = blnkID
	c.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, c); err != nil {
		return nil, fmt.Errorf("save blnk identity: %w", err)
	}

	c.Normalize()
	return c, nil
}

func (s *customerService) createBlnkIdentity(ctx context.Context, c *model.Customer) (string, error) {
	if c.BlnkIdentityID != "" {
		return c.BlnkIdentityID, nil
	}

	ident, err := s.blnkCl.CreateIdentity(ctx, blnk.CreateIdentityRequest{
		IdentityType: "individual",
		FirstName:    c.FirstName,
		LastName:     c.LastName,
		EmailAddress: c.Email,
		PhoneNumber:  c.Phone,
		MetaData:     map[string]any{"app_customer_id": c.ID},
	})
	if err != nil {
		return "", err
	}

	return ident.IdentityID, nil
}
