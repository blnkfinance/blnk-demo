package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/blnk-demo/pro-loan-app/backend/internal/blnk"
	"github.com/blnk-demo/pro-loan-app/backend/internal/ledger"
	ledgermodel "github.com/blnk-demo/pro-loan-app/backend/internal/ledger/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/id"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/ledgersetup"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/settings"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/treasury"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/treasury/model"
)

const currencyPrecision = int64(100)

type treasuryService struct {
	blnkCl       *blnk.Client
	settingsRepo *settings.Repository
	ledgerSvc    ledger.Service
}

func New(
	blnkCl *blnk.Client,
	settingsRepo *settings.Repository,
	ledgerSvc ledger.Service,
) treasury.Service {
	return &treasuryService{
		blnkCl:       blnkCl,
		settingsRepo: settingsRepo,
		ledgerSvc:    ledgerSvc,
	}
}

func normalizeCurrency(currency string) string {
	return strings.ToUpper(strings.TrimSpace(currency))
}

func (s *treasuryService) indicatorBalance(ctx context.Context, indicator, currency string) int64 {
	bal, err := s.blnkCl.GetBalanceByIndicator(ctx, indicator, currency)
	if err != nil {
		return 0
	}
	return bal.BalanceMinorUnits()
}

func (s *treasuryService) GetStatus(ctx context.Context, currency string) (*model.Status, error) {
	currency = normalizeCurrency(currency)
	if currency == "" {
		currency = "NGN"
	}

	return &model.Status{
		Currency:                currency,
		FundingPoolIndicator:    ledgersetup.FundingPoolIndicator(currency),
		WorldIndicator:          ledgersetup.WorldIndicator(currency),
		FundingPoolBalanceCents: s.indicatorBalance(ctx, ledgersetup.FundingPoolIndicator(currency), currency),
		WorldBalanceCents:       s.indicatorBalance(ctx, ledgersetup.WorldIndicator(currency), currency),
	}, nil
}

func (s *treasuryService) FundingPoolBalanceCents(ctx context.Context, currency string) (int64, error) {
	status, err := s.GetStatus(ctx, currency)
	if err != nil {
		return 0, err
	}
	return status.FundingPoolBalanceCents, nil
}

func (s *treasuryService) PrefundFundingPool(ctx context.Context, input model.PrefundInput) (*model.PrefundResult, error) {
	currency := normalizeCurrency(input.Currency)
	if currency == "" {
		return nil, fmt.Errorf("currency is required")
	}
	if input.AmountCents <= 0 {
		return nil, fmt.Errorf("amount_cents must be positive")
	}

	reference := strings.TrimSpace(input.Reference)
	if reference == "" {
		reference = id.Ref("prefund", id.New())
	}

	description := strings.TrimSpace(input.Description)
	if description == "" {
		description = "Treasury prefund from @World"
	}

	world := ledgersetup.WorldIndicator(currency)
	fundingPool := ledgersetup.FundingPoolIndicator(currency)

	localOp, err := s.ledgerSvc.Record(ctx, ledgermodel.RecordInput{
		LoanID:      treasury.PlatformLoanID,
		Kind:        ledgermodel.KindTreasuryPrefund,
		Reference:   reference,
		AmountCents: input.AmountCents,
		Currency:    currency,
	})
	if err != nil {
		return nil, fmt.Errorf("record treasury prefund: %w", err)
	}

	if localOp.Status == ledgermodel.OperationPosted && localOp.BlnkTransactionID != "" {
		balance, _ := s.FundingPoolBalanceCents(ctx, currency)
		return &model.PrefundResult{
			TransactionID:           localOp.BlnkTransactionID,
			Reference:               reference,
			Currency:                currency,
			AmountCents:             input.AmountCents,
			FundingPoolBalanceCents: balance,
		}, nil
	}

	meta := map[string]any{
		"type":         "treasury_prefund",
		"initiated_by": "admin",
	}
	tx, err := s.blnkCl.PostLeg(
		ctx,
		currencyPrecision,
		reference,
		currency,
		world,
		fundingPool,
		description,
		input.AmountCents,
		false,
		true,
		true,
		meta,
	)
	if err != nil {
		if blnk.IsDuplicateReferenceError(err) {
			if existing, findErr := s.blnkCl.FindTransactionByReference(ctx, reference); findErr == nil {
				tx = existing
			} else {
				_, _ = s.ledgerSvc.MarkFailed(ctx, localOp.ID, err.Error())
				return nil, fmt.Errorf("post treasury prefund: %w", err)
			}
		} else {
			_, _ = s.ledgerSvc.MarkFailed(ctx, localOp.ID, err.Error())
			return nil, fmt.Errorf("post treasury prefund: %w", err)
		}
	}

	if _, err := s.ledgerSvc.MarkPosted(ctx, localOp.ID, tx.TransactionID, ""); err != nil {
		return nil, fmt.Errorf("mark treasury prefund posted: %w", err)
	}

	if plat, err := s.settingsRepo.Get(ctx); err == nil && plat.PlatformIdentityID != "" {
		ledgersetup.TryLinkPlatformIdentity(ctx, s.blnkCl, plat.PlatformIdentityID, world)
		ledgersetup.TryLinkPlatformIdentity(ctx, s.blnkCl, plat.PlatformIdentityID, fundingPool)
	}

	balance, _ := s.FundingPoolBalanceCents(ctx, currency)
	return &model.PrefundResult{
		TransactionID:           tx.TransactionID,
		Reference:               reference,
		Currency:                currency,
		AmountCents:             input.AmountCents,
		FundingPoolBalanceCents: balance,
	}, nil
}
