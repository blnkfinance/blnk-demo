package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/blnk"
	"github.com/blnk-demo/pay-recon/backend/internal/config"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnkaccounts"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnksetup"
	"github.com/blnk-demo/pay-recon/backend/internal/remittances"
	"github.com/blnk-demo/pay-recon/backend/internal/remittances/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	repo         remittances.Repository
	pool         *pgxpool.Pool
	accountsRepo *blnkaccounts.Repository
	blnkCl       *blnk.Client
	cfg          config.Config
}

func New(repo remittances.Repository, pool *pgxpool.Pool, accountsRepo *blnkaccounts.Repository, blnkCl *blnk.Client, cfg config.Config) remittances.Service {
	return &Service{repo: repo, pool: pool, accountsRepo: accountsRepo, blnkCl: blnkCl, cfg: cfg}
}

func (s *Service) Create(ctx context.Context, input model.CreateRemittanceInput) (*model.Remittance, error) {
	period := strings.TrimSpace(input.Period)
	if period == "" {
		return nil, fmt.Errorf("period is required (YYYY-MM)")
	}

	existing, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	for _, rem := range existing {
		if rem.Period == period {
			return nil, fmt.Errorf("remittance for period %s already exists", period)
		}
	}

	// Sum WHT for bills paid in this calendar month (payment date), excluding amounts
	// already covered by prior remittances for other periods is handled by unique period.
	var total int64
	err = s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(wht_amount), 0) FROM bills
		WHERE status IN ('paid_unreconciled', 'paid_reconciled', 'paid')
		  AND wht_amount > 0
		  AND to_char(COALESCE(bank_payment_date, payment_confirmed_at, created_at), 'YYYY-MM') = $1
	`, period).Scan(&total)
	if err != nil {
		return nil, err
	}
	if total <= 0 {
		return nil, fmt.Errorf("no wht amount for period %s (use bills confirmed/paid in that month)", period)
	}

	taxPayable, err := blnksetup.TaxPayableIndicator(ctx, s.accountsRepo)
	if err != nil {
		return nil, err
	}
	liabilityClearing, err := blnksetup.LiabilityClearingIndicator(ctx, s.accountsRepo)
	if err != nil {
		return nil, err
	}

	ref := "wht_remit_" + period
	txn, err := s.blnkCl.PostLeg(ctx, ref, s.cfg.DefaultCurrency, taxPayable, liabilityClearing,
		"WHT remittance "+period, total, true, true, true, map[string]any{"period": period, "type": "wht_remittance"})
	if err != nil {
		if blnk.IsDuplicateReferenceError(err) {
			return nil, fmt.Errorf("remittance for period %s already exists in ledger", period)
		}
		return nil, err
	}

	rem := &model.Remittance{
		ID:          uuid.NewString(),
		Period:      period,
		TotalAmount: total,
		BlnkTxnID:   txn.TransactionID,
		Status:      model.StatusAwaitingPayment,
		CreatedAt:   time.Now().UTC(),
	}
	if err := s.repo.Create(ctx, rem); err != nil {
		return nil, fmt.Errorf("persist remittance after ledger post: %w (retry may hit duplicate reference)", err)
	}
	return rem, nil
}

func (s *Service) List(ctx context.Context) ([]*model.Remittance, error) {
	return s.repo.List(ctx)
}

func (s *Service) Confirm(ctx context.Context, id string, input model.ConfirmRemittanceInput) (*model.Remittance, error) {
	rem, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if rem.Status != model.StatusAwaitingPayment {
		return nil, fmt.Errorf("remittance is not awaiting payment")
	}
	if strings.TrimSpace(input.BankPaymentReference) == "" {
		return nil, fmt.Errorf("bank_payment_reference is required")
	}
	paymentDate := time.Now().UTC()
	if strings.TrimSpace(input.BankPaymentDate) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(input.BankPaymentDate))
		if err != nil {
			return nil, fmt.Errorf("invalid bank_payment_date")
		}
		paymentDate = parsed
	}

	if _, err := s.blnkCl.CommitInflight(ctx, rem.BlnkTxnID); err != nil {
		if !blnk.IsInflightAlreadyHandledError(err) {
			return nil, err
		}
	}

	operating, err := blnksetup.OperatingIndicator(ctx, s.accountsRepo)
	if err != nil {
		return nil, err
	}
	firs, err := blnksetup.FIRSRemittanceIndicator(ctx, s.accountsRepo)
	if err != nil {
		return nil, err
	}

	cashRef := "wht_remit_cash_" + rem.Period
	if _, err := s.blnkCl.PostLeg(ctx, cashRef, s.cfg.DefaultCurrency, operating, firs,
		"WHT remittance cash "+rem.Period, rem.TotalAmount, false, true, true, map[string]any{
			"period":                 rem.Period,
			"type":                   "wht_remittance_cash",
			"remittance_id":          rem.ID,
			"bank_payment_reference": strings.TrimSpace(input.BankPaymentReference),
		}); err != nil && !blnk.IsDuplicateReferenceError(err) {
		return nil, fmt.Errorf("wht remittance cash: %w", err)
	}

	if err := s.repo.MarkPaymentSent(ctx, id, input, time.Now().UTC(), paymentDate); err != nil {
		return nil, fmt.Errorf("ledger cash posted but persist failed — retry confirm: %w", err)
	}
	return s.repo.GetByID(ctx, id)
}
