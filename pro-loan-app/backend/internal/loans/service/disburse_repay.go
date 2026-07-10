package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/blnk"
	ledgermodel "github.com/blnk-demo/pro-loan-app/backend/internal/ledger/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/loans/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/loans/schedule"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/id"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/ledgersetup"
	wmodel "github.com/blnk-demo/pro-loan-app/backend/internal/wallet/model"
)

// Quote returns a disbursement breakdown and estimated EMI without persisting.
func (s *loanService) Quote(ctx context.Context, input model.QuoteInput) (*model.QuoteResult, error) {
	prod, err := s.productRepo.GetByID(ctx, input.ProductID)
	if err != nil {
		return nil, fmt.Errorf("product not found: %w", err)
	}
	if prod.Archived {
		return nil, fmt.Errorf("product %s is archived", input.ProductID)
	}
	if input.PrincipalCents < prod.PrincipalMinCents || input.PrincipalCents > prod.PrincipalMaxCents {
		return nil, fmt.Errorf(
			"principal %d is outside product limits [%d, %d]",
			input.PrincipalCents, prod.PrincipalMinCents, prod.PrincipalMaxCents,
		)
	}
	termMonths := input.TermMonths
	if termMonths <= 0 {
		termMonths = prod.TermMonths
	}

	breakdown := model.ComputeDisbursementBreakdown(input.PrincipalCents, prod.OriginationFeeBps, prod.Currency)
	return &model.QuoteResult{
		ProductID:         input.ProductID,
		PrincipalCents:    input.PrincipalCents,
		TermMonths:        termMonths,
		Currency:          prod.Currency,
		AnnualInterestBps: prod.AnnualInterestBps,
		OriginationFeeBps: prod.OriginationFeeBps,
		Disbursement:      breakdown,
		EstimatedEMICents: estimateEMICents(input.PrincipalCents, prod.AnnualInterestBps, termMonths),
	}, nil
}

// Apply creates a new loan application in draft status. Product terms are
// copied at creation time so the loan is self-contained.
func (s *loanService) Apply(ctx context.Context, input model.CreateApplicationInput) (*model.Application, error) {
	prod, err := s.productRepo.GetByID(ctx, input.ProductID)
	if err != nil {
		return nil, fmt.Errorf("product not found: %w", err)
	}
	if prod.Archived {
		return nil, fmt.Errorf("product %s is archived", input.ProductID)
	}
	if input.PrincipalCents < prod.PrincipalMinCents || input.PrincipalCents > prod.PrincipalMaxCents {
		return nil, fmt.Errorf(
			"principal %d is outside product limits [%d, %d]",
			input.PrincipalCents, prod.PrincipalMinCents, prod.PrincipalMaxCents,
		)
	}

	activeFilter := model.ListFilter{
		CustomerID: input.CustomerID,
		Statuses: []model.Status{
			model.StatusDraft,
			model.StatusSubmitted,
			model.StatusApproved,
			model.StatusActive,
		},
		PageSize: 1,
	}
	existing, _, err := s.repo.List(ctx, activeFilter)
	if err != nil {
		return nil, fmt.Errorf("check existing loans: %w", err)
	}
	if len(existing) > 0 {
		return nil, fmt.Errorf(
			"cannot apply: customer already has a loan (%s) in status %s",
			existing[0].ID, existing[0].Status,
		)
	}

	receivableBalanceID, err := s.customerSvc.EnsureLoanReceivableBalance(ctx, input.CustomerID, prod.Currency)
	if err != nil {
		return nil, fmt.Errorf("ensure loan receivable balance: %w", err)
	}

	now := time.Now().UTC()
	breakdown := model.ComputeDisbursementBreakdown(input.PrincipalCents, prod.OriginationFeeBps, prod.Currency)
	app := &model.Application{
		ID:                    id.New(),
		CustomerID:            input.CustomerID,
		ProductID:             input.ProductID,
		Status:                model.StatusDraft,
		PrincipalCents:        input.PrincipalCents,
		Currency:              prod.Currency,
		TermMonths:            input.TermMonths,
		AnnualInterestBps:     prod.AnnualInterestBps,
		OriginationFeeBps:     prod.OriginationFeeBps,
		DisbursementBreakdown: breakdown,
		BlnkMappings: model.BlnkMappings{
			LoanBalanceID: receivableBalanceID,
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.Create(ctx, app); err != nil {
		return nil, fmt.Errorf("create application: %w", err)
	}

	return app, nil
}

// Disburse transitions an approved loan to active, wires up Blnk objects, and
// sends the funds to the customer's wallet balance.
func (s *loanService) Disburse(ctx context.Context, loanID string) (*model.Application, error) {
	app, err := s.repo.GetByID(ctx, loanID)
	if err != nil {
		return nil, err
	}
	if app.Status != model.StatusApproved {
		return nil, fmt.Errorf("loan %s cannot be disbursed from status %s", loanID, app.Status)
	}

	plat, err := s.settingsRepo.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("load platform settings: %w", err)
	}
	if plat.WalletLedgerID == "" || plat.ReceivableLedgerID == "" {
		return nil, fmt.Errorf("platform ledgers not bootstrapped; run bootstrap first")
	}

	cust, err := s.customerRepo.GetByID(ctx, app.CustomerID)
	if err != nil {
		return nil, fmt.Errorf("get customer: %w", err)
	}
	cust.Normalize()

	walletBalanceID, err := s.customerSvc.EnsureWalletBalance(ctx, app.CustomerID, app.Currency)
	if err != nil {
		return nil, fmt.Errorf("ensure wallet balance: %w", err)
	}

	receivableBalanceID, err := s.customerSvc.EnsureLoanReceivableBalance(ctx, app.CustomerID, app.Currency)
	if err != nil {
		return nil, fmt.Errorf("ensure loan receivable balance: %w", err)
	}

	if app.BlnkMappings.IdentityID == "" {
		if cust.BlnkIdentityID == "" {
			ident, err := s.blnkCl.CreateIdentity(ctx, blnk.CreateIdentityRequest{
				IdentityType: "individual",
				FirstName:    cust.FirstName,
				LastName:     cust.LastName,
				EmailAddress: cust.Email,
				PhoneNumber:  cust.Phone,
				MetaData:     map[string]any{"app_customer_id": cust.ID},
			})
			if err != nil {
				return nil, fmt.Errorf("create blnk identity: %w", err)
			}
			cust.BlnkIdentityID = ident.IdentityID
			cust.UpdatedAt = time.Now().UTC()
			if err := s.customerRepo.Update(ctx, cust); err != nil {
				slog.Warn("failed to persist blnk identity on customer", "err", err)
			}
		}
		app.BlnkMappings.IdentityID = cust.BlnkIdentityID
		app.BlnkMappings.ReceivableLedgerID = plat.ReceivableLedgerID
	}
	app.BlnkMappings.LoanBalanceID = receivableBalanceID

	breakdown := app.DisbursementBreakdown
	if breakdown.Currency == "" {
		breakdown = model.ComputeDisbursementBreakdown(app.PrincipalCents, app.OriginationFeeBps, app.Currency)
		app.DisbursementBreakdown = breakdown
	}

	fundingBalanceID, revenueBalanceID, originationContraID, breakdown := s.resolveDisburseBalances(app)

	poolBalance, err := s.treasurySvc.FundingPoolBalanceCents(ctx, app.Currency)
	if err != nil {
		return nil, fmt.Errorf("check funding pool balance: %w", err)
	}
	if poolBalance < breakdown.RequestedPrincipalCents {
		return nil, fmt.Errorf(
			"insufficient funding pool balance: have %d, need %d; prefund treasury before disbursing",
			poolBalance, breakdown.RequestedPrincipalCents,
		)
	}

	disbRef := id.Ref("disb", app.ID)
	batchID := id.New()

	localOp, err := s.ledgerSvc.Record(ctx, ledgermodel.RecordInput{
		LoanID:      app.ID,
		Kind:        ledgermodel.KindDisbursement,
		Reference:   disbRef,
		AmountCents: breakdown.NetDisbursementCents,
		Currency:    app.Currency,
	})
	if err != nil {
		slog.Warn("record disbursement op failed", "loan_id", app.ID, "err", err)
	}

	if !disburseLegsComplete(app, breakdown) {
		legs := []disburseLeg{
			{
				key:         "net",
				reference:   id.Ref(disbRef, "net"),
				source:      fundingBalanceID,
				destination: walletBalanceID,
				amount:      breakdown.NetDisbursementCents,
				description: fmt.Sprintf("Loan disbursement net for %s", app.ID),
				inflight:    true,
				overdraft:   true,
			},
			{
				key:         "origination",
				reference:   id.Ref(disbRef, "fee"),
				source:      fundingBalanceID,
				destination: revenueBalanceID,
				amount:      breakdown.OriginationFeeCents,
				description: fmt.Sprintf("Origination fee for loan %s", app.ID),
			},
			{
				key:         "receivable",
				reference:   id.Ref(disbRef, "recv"),
				source:      originationContraID,
				destination: receivableBalanceID,
				amount:      breakdown.RequestedPrincipalCents,
				description: fmt.Sprintf("Book loan receivable for %s", app.ID),
				overdraft:   true,
			},
		}

		if _, err := s.postDisburseLegs(ctx, app, batchID, legs); err != nil {
			if saveErr := s.repo.Update(ctx, app); saveErr != nil {
				slog.Warn("failed to persist partial disburse legs", "loan_id", app.ID, "err", saveErr)
			}
			if localOp != nil {
				_, _ = s.ledgerSvc.MarkFailed(ctx, localOp.ID, err.Error())
			}
			return nil, err
		}

		if err := s.repo.Update(ctx, app); err != nil {
			return nil, fmt.Errorf("persist disburse legs: %w", err)
		}

		if localOp != nil && app.BlnkMappings.DisbursementTransactionID != "" {
			if _, err := s.ledgerSvc.MarkPosted(ctx, localOp.ID, app.BlnkMappings.DisbursementTransactionID, ""); err != nil {
				slog.Warn("mark disbursement op posted failed", "err", err)
			}
		}

		if _, err := s.walletSvc.Record(ctx, wmodel.RecordInput{
			CustomerID:   app.CustomerID,
			Type:         wmodel.TxLoanDisbursement,
			AmountCents:  breakdown.NetDisbursementCents,
			Currency:     app.Currency,
			Description:  fmt.Sprintf("Loan disbursement — %s", app.ID[:8]),
			Reference:    id.Ref(disbRef, "net"),
			BlnkTxID:     app.BlnkMappings.DisbursementTransactionID,
		}); err != nil {
			slog.Warn("record wallet tx for disbursement failed", "loan_id", app.ID, "err", err)
		}
	}

	now := time.Now().UTC()
	lines := schedule.Build(
		app.PrincipalCents,
		int(app.AnnualInterestBps),
		app.TermMonths,
		now,
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

	app.Status = model.StatusActive
	app.DisbursedAt = &now
	app.UpdatedAt = now

	if err := s.repo.Update(ctx, app); err != nil {
		return nil, fmt.Errorf("activate loan: %w", err)
	}

	return app, nil
}

// VoidDisbursement voids the inflight net disbursement and reverses posted legs.
func (s *loanService) VoidDisbursement(ctx context.Context, loanID string) (*model.Application, error) {
	app, err := s.repo.GetByID(ctx, loanID)
	if err != nil {
		return nil, err
	}
	if app.Status != model.StatusActive {
		return nil, fmt.Errorf("loan %s is not active (status: %s)", loanID, app.Status)
	}
	if app.BlnkMappings.DisbursementTransactionID == "" {
		return nil, fmt.Errorf("loan %s has no disbursement transaction to void", loanID)
	}
	if app.CommittedAt != nil {
		return nil, fmt.Errorf("loan %s disbursement already committed; cannot void", loanID)
	}

	if _, err := s.blnkCl.VoidInflight(ctx, app.BlnkMappings.DisbursementTransactionID); err != nil {
		return nil, fmt.Errorf("void inflight disbursement: %w", err)
	}

	for leg, txID := range app.BlnkMappings.DisbursementLegTxIDs {
		if leg == "net" || txID == "" {
			continue
		}
		if _, err := s.blnkCl.RefundTransaction(ctx, txID); err != nil {
			slog.Warn("refund disburse leg failed", "leg", leg, "tx_id", txID, "err", err)
		}
	}

	receivableBalanceID := app.BlnkMappings.LoanBalanceID
	if receivableBalanceID != "" && app.DisbursementBreakdown.RequestedPrincipalCents > 0 {
		settlementID := ledgersetup.LoanSettlementIndicator(app.Currency)
		ref := id.Ref("loan", app.ID, "disbursement", "void", "receivable")
		_, _ = s.blnkCl.PostLeg(
			ctx, currencyPrecision, ref, app.Currency,
			receivableBalanceID, settlementID,
			fmt.Sprintf("Reverse receivable booking for loan %s", app.ID),
			app.DisbursementBreakdown.RequestedPrincipalCents,
			false, true, true,
			map[string]any{"app_loan_id": app.ID, "leg": "receivable_void"},
		)
	}

	app.BlnkMappings.DisbursementTransactionID = ""
	app.BlnkMappings.DisbursementLegTxIDs = nil
	app.Status = model.StatusApproved
	app.DisbursedAt = nil
	app.Schedule = nil
	app.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, app); err != nil {
		return nil, fmt.Errorf("revert loan after void: %w", err)
	}

	return app, nil
}

// PayScheduleLine marks a schedule line as paid with split ledger legs.
func (s *loanService) PayScheduleLine(ctx context.Context, loanID, scheduleID string) (*model.ScheduleLine, error) {
	app, err := s.repo.GetByID(ctx, loanID)
	if err != nil {
		return nil, err
	}

	line, err := s.repo.GetScheduleLine(ctx, loanID, scheduleID)
	if err != nil {
		return nil, err
	}

	if line.Status == model.SchedulePaid {
		return line, nil
	}

	walletBalanceID, err := s.customerSvc.EnsureWalletBalance(ctx, app.CustomerID, app.Currency)
	if err != nil {
		return nil, fmt.Errorf("ensure wallet balance: %w", err)
	}

	receivableBalanceID := app.BlnkMappings.LoanBalanceID
	if receivableBalanceID == "" {
		receivableBalanceID, err = s.customerSvc.EnsureLoanReceivableBalance(ctx, app.CustomerID, app.Currency)
		if err != nil {
			return nil, fmt.Errorf("ensure loan receivable balance: %w", err)
		}
		app.BlnkMappings.LoanBalanceID = receivableBalanceID
	}

	senderBal, err := s.blnkCl.GetBalance(ctx, walletBalanceID)
	if err != nil {
		return nil, fmt.Errorf("get wallet balance: %w", err)
	}

	total := line.PrincipalCents + line.InterestCents + line.FeeCents
	if senderBal.BalanceMinorUnits() < total {
		return nil, fmt.Errorf("insufficient wallet balance: have %d, need %d", senderBal.BalanceMinorUnits(), total)
	}

	fundingBalanceID, interestBalanceID, feeBalanceID, revenueBalanceID, settlementBalanceID := resolveRepayBalances(app.Currency)

	repayRef := id.Ref("loan", loanID, "schedule", scheduleID, "repayment")
	batchID := id.New()

	localOp, recErr := s.ledgerSvc.Record(ctx, ledgermodel.RecordInput{
		LoanID:      loanID,
		Kind:        ledgermodel.KindRepayment,
		Reference:   repayRef,
		AmountCents: total,
		Currency:    app.Currency,
	})
	if recErr != nil {
		slog.Warn("record repayment op failed", "loan_id", loanID, "err", recErr)
	}

	feeDest := feeBalanceID
	if line.FeeCents > 0 {
		feeDest = revenueBalanceID
	}

	legs := []repayLeg{
		{
			key:         "principal",
			reference:   id.Ref(repayRef, "principal"),
			source:      walletBalanceID,
			destination: fundingBalanceID,
			amount:      line.PrincipalCents,
			description: fmt.Sprintf("Principal repayment loan %s", loanID),
		},
		{
			key:         "interest",
			reference:   id.Ref(repayRef, "interest"),
			source:      walletBalanceID,
			destination: interestBalanceID,
			amount:      line.InterestCents,
			description: fmt.Sprintf("Interest repayment loan %s", loanID),
		},
		{
			key:         "fee",
			reference:   id.Ref(repayRef, "fee"),
			source:      walletBalanceID,
			destination: feeDest,
			amount:      line.FeeCents,
			description: fmt.Sprintf("Fee repayment loan %s", loanID),
		},
		{
			key:         "receivable",
			reference:   id.Ref(repayRef, "receivable"),
			source:      receivableBalanceID,
			destination: settlementBalanceID,
			amount:      line.PrincipalCents,
			description: fmt.Sprintf("Reduce loan receivable loan %s", loanID),
		},
	}

	s.recoverExistingRepayLegs(ctx, line, legs)

	if !repayLegsComplete(line, legs) {
		if _, err := s.postRepayLegs(ctx, app, line, batchID, legs); err != nil {
			if saveErr := s.repo.UpdateScheduleLine(ctx, loanID, *line); saveErr != nil {
				slog.Warn("failed to persist partial repayment legs", "loan_id", loanID, "schedule_id", scheduleID, "err", saveErr)
			}
			if localOp != nil {
				_, _ = s.ledgerSvc.MarkFailed(ctx, localOp.ID, err.Error())
			}
			return nil, err
		}

		if err := s.repo.UpdateScheduleLine(ctx, loanID, *line); err != nil {
			return nil, fmt.Errorf("persist repayment legs: %w", err)
		}
	}

	if localOp != nil && line.BlnkTxID != "" {
		if _, err := s.ledgerSvc.MarkPosted(ctx, localOp.ID, line.BlnkTxID, ""); err != nil {
			slog.Warn("mark repayment op posted failed", "err", err)
		}
	}

	now := time.Now().UTC()
	line.Status = model.SchedulePaid
	line.PaidAt = &now

	if err := s.repo.UpdateScheduleLine(ctx, loanID, *line); err != nil {
		return nil, fmt.Errorf("mark schedule line paid: %w", err)
	}

	if _, err := s.walletSvc.Record(ctx, wmodel.RecordInput{
		CustomerID:  app.CustomerID,
		Type:        wmodel.TxLoanRepayment,
		AmountCents: total,
		Currency:    app.Currency,
		Description: fmt.Sprintf("Loan repayment — %s", app.ID[:8]),
		Reference:   repayRef,
		BlnkTxID:    line.BlnkTxID,
	}); err != nil {
		slog.Warn("record wallet tx for repayment failed", "loan_id", loanID, "err", err)
	}

	allPaid := true
	for _, sl := range app.Schedule {
		if sl.ID == scheduleID {
			continue
		}
		if sl.Status != model.SchedulePaid {
			allPaid = false
			break
		}
	}
	if line.Status == model.SchedulePaid && allPaid {
		app.Status = model.StatusClosed
		app.ClosedAt = &now
		app.UpdatedAt = now
		if err := s.repo.Update(ctx, app); err != nil {
			slog.Warn("failed to close loan", "loan_id", loanID, "err", err)
		}
	}

	return line, nil
}
