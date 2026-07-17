package service

import (
	"context"
	"strings"

	"github.com/blnk-demo/pay-recon/backend/internal/blnk"
	"github.com/blnk-demo/pay-recon/backend/internal/config"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnkaccounts"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnksetup"
	"github.com/blnk-demo/pay-recon/backend/internal/treasury"
	"github.com/blnk-demo/pay-recon/backend/internal/treasury/model"
)

type Service struct {
	accountsRepo *blnkaccounts.Repository
	blnkCl       *blnk.Client
	cfg          config.Config
}

func New(accountsRepo *blnkaccounts.Repository, blnkCl *blnk.Client, cfg config.Config) treasury.Service {
	return &Service{
		accountsRepo: accountsRepo,
		blnkCl:       blnkCl,
		cfg:          cfg,
	}
}

func (s *Service) GetBankCashPosition(ctx context.Context) (*model.BankCashPosition, error) {
	operating, err := blnksetup.OperatingIndicator(ctx, s.accountsRepo)
	if err != nil {
		return nil, err
	}
	currency := strings.ToUpper(strings.TrimSpace(s.cfg.DefaultCurrency))
	pos := &model.BankCashPosition{
		OperatingIndicator: operating,
		Currency:           currency,
		SyncNote:           "Ledger cash syncs from bank statement funding credits you upload in Reconciliation. PayRecon does not connect to the bank — download a statement from your bank app and import it.",
	}

	balance, err := s.blnkCl.GetBalanceByIndicator(ctx, operating, currency)
	if err != nil {
		if !blnk.IsNotFoundError(err) {
			return nil, err
		}
	} else {
		pos.BalanceKobo = blnk.MinorUnits(balance.Balance)
	}

	return pos, nil
}
