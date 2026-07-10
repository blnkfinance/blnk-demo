package service

import (
	"context"
	"fmt"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/blnk"
	"github.com/blnk-demo/pro-loan-app/backend/internal/customer"
	"github.com/blnk-demo/pro-loan-app/backend/internal/ledger"
	"github.com/blnk-demo/pro-loan-app/backend/internal/loans"
	"github.com/blnk-demo/pro-loan-app/backend/internal/loans/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/loans/schedule"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/settings"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/treasury"
	"github.com/blnk-demo/pro-loan-app/backend/internal/products"
	"github.com/blnk-demo/pro-loan-app/backend/internal/wallet"
)

type loanService struct {
	repo         loans.Repository
	productRepo  products.Repository
	customerRepo customer.Repository
	customerSvc  customer.Service
	blnkCl       *blnk.Client
	settingsRepo *settings.Repository
	ledgerSvc    ledger.Service
	treasurySvc  treasury.Service
	walletSvc    wallet.Service
}

const currencyPrecision = int64(100)

func New(
	repo loans.Repository,
	productRepo products.Repository,
	customerRepo customer.Repository,
	customerSvc customer.Service,
	blnkCl *blnk.Client,
	settingsRepo *settings.Repository,
	ledgerSvc ledger.Service,
	treasurySvc treasury.Service,
	walletSvc wallet.Service,
) loans.Service {
	return &loanService{
		repo:         repo,
		productRepo:  productRepo,
		customerRepo: customerRepo,
		customerSvc:  customerSvc,
		blnkCl:       blnkCl,
		settingsRepo: settingsRepo,
		ledgerSvc:    ledgerSvc,
		treasurySvc:  treasurySvc,
		walletSvc:    walletSvc,
	}
}

// Submit moves a draft application to submitted for admin review.
func (s *loanService) Submit(ctx context.Context, loanID string) (*model.Application, error) {
	app, err := s.repo.GetByID(ctx, loanID)
	if err != nil {
		return nil, err
	}
	if app.Status != model.StatusDraft {
		return nil, fmt.Errorf("loan %s cannot be submitted from status %s", loanID, app.Status)
	}
	app.Status = model.StatusSubmitted
	app.UpdatedAt = time.Now().UTC()
	if err := s.repo.Update(ctx, app); err != nil {
		return nil, fmt.Errorf("submit loan: %w", err)
	}
	return app, nil
}

func (s *loanService) GetByID(ctx context.Context, loanID string) (*model.Application, error) {
	return s.repo.GetByID(ctx, loanID)
}

func (s *loanService) List(ctx context.Context, filter model.ListFilter) ([]*model.Application, int64, error) {
	return s.repo.List(ctx, filter)
}

// Approve transitions the loan to approved status and generates the repayment
// schedule.
func (s *loanService) Approve(ctx context.Context, loanID string) (*model.Application, error) {
	app, err := s.repo.GetByID(ctx, loanID)
	if err != nil {
		return nil, err
	}

	if app.Status != model.StatusDraft && app.Status != model.StatusSubmitted {
		return nil, fmt.Errorf("loan %s cannot be approved from status %s", loanID, app.Status)
	}

	lines := schedule.Build(
		app.PrincipalCents,
		int(app.AnnualInterestBps),
		app.TermMonths,
		time.Now().UTC(),
	)

	app.Schedule = make([]model.ScheduleLine, len(lines))
	for i, l := range lines {
		app.Schedule[i] = model.ScheduleLine{
			ID:             l.ID,
			DueDate:        l.DueDate,
			PrincipalCents: l.PrincipalCents,
			InterestCents:  l.InterestCents,
			FeeCents:       l.FeeCents,
			Status:         model.ScheduleScheduled,
		}
	}

	now := time.Now().UTC()
	app.Status = model.StatusApproved
	app.ApprovedAt = &now
	app.UpdatedAt = now

	if err := s.repo.Update(ctx, app); err != nil {
		return nil, fmt.Errorf("approve loan: %w", err)
	}

	return app, nil
}

func (s *loanService) Reject(ctx context.Context, loanID, reason string) (*model.Application, error) {
	app, err := s.repo.GetByID(ctx, loanID)
	if err != nil {
		return nil, err
	}

	if app.Status != model.StatusDraft && app.Status != model.StatusSubmitted {
		return nil, fmt.Errorf("loan %s cannot be rejected from status %s", loanID, app.Status)
	}

	now := time.Now().UTC()
	app.Status = model.StatusRejected
	app.RejectionNote = reason
	app.RejectedAt = &now
	app.UpdatedAt = now

	if err := s.repo.Update(ctx, app); err != nil {
		return nil, fmt.Errorf("reject loan: %w", err)
	}

	return app, nil
}

// CommitDisbursement commits the inflight Blnk disbursement transaction for an
// active loan, settling the funds permanently in the customer's wallet.
func (s *loanService) CommitDisbursement(ctx context.Context, loanID string) (*model.Application, error) {
	app, err := s.repo.GetByID(ctx, loanID)
	if err != nil {
		return nil, err
	}
	if app.Status != model.StatusActive {
		return nil, fmt.Errorf("loan %s is not active (status: %s)", loanID, app.Status)
	}
	if app.BlnkMappings.DisbursementTransactionID == "" {
		return nil, fmt.Errorf("loan %s has no disbursement transaction to commit", loanID)
	}
	if app.CommittedAt != nil {
		return app, nil
	}

	if _, err := s.blnkCl.CommitInflight(ctx, app.BlnkMappings.DisbursementTransactionID, nil); err != nil {
		return nil, fmt.Errorf("commit inflight disbursement: %w", err)
	}

	now := time.Now().UTC()
	app.CommittedAt = &now
	app.UpdatedAt = now

	if err := s.repo.Update(ctx, app); err != nil {
		return nil, fmt.Errorf("persist committed_at: %w", err)
	}

	return app, nil
}

// RepayNextDue finds the first unpaid schedule line and repays it from the
// customer's wallet. Returns the paid line.
func (s *loanService) RepayNextDue(ctx context.Context, loanID string) (*model.ScheduleLine, error) {
	app, err := s.repo.GetByID(ctx, loanID)
	if err != nil {
		return nil, err
	}

	if app.Status != model.StatusActive {
		return nil, fmt.Errorf("loan %s is not active (status: %s)", loanID, app.Status)
	}

	var firstUnpaid *model.ScheduleLine
	for i := range app.Schedule {
		sl := app.Schedule[i]
		if sl.Status == model.ScheduleScheduled || sl.Status == model.ScheduleDue || sl.Status == model.ScheduleOverdue {
			if firstUnpaid == nil || sl.DueDate.Before(firstUnpaid.DueDate) {
				firstUnpaid = &sl
			}
		}
	}

	if firstUnpaid == nil {
		return nil, fmt.Errorf("loan %s has no unpaid schedule lines", loanID)
	}

	return s.PayScheduleLine(ctx, loanID, firstUnpaid.ID)
}
