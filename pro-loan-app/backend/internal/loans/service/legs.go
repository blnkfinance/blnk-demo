package service

import (
	"context"
	"fmt"
	"math"

	"github.com/blnk-demo/pro-loan-app/backend/internal/blnk"
	"github.com/blnk-demo/pro-loan-app/backend/internal/loans/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/id"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/ledgersetup"
)

func estimateEMICents(principalCents int64, annualInterestBps int64, termMonths int) int64 {
	if termMonths <= 0 {
		return 0
	}
	monthlyRate := float64(annualInterestBps) / 10000.0 / 12.0
	if monthlyRate == 0 {
		return principalCents / int64(termMonths)
	}
	n := float64(termMonths)
	emi := float64(principalCents) * monthlyRate / (1 - math.Pow(1+monthlyRate, -n))
	return int64(math.Round(emi))
}

type disburseLeg struct {
	key         string
	reference   string
	source      string
	destination string
	amount      int64
	description string
	inflight    bool
	overdraft   bool
}

func (s *loanService) postDisburseLegs(
	ctx context.Context,
	app *model.Application,
	batchID string,
	legs []disburseLeg,
) (map[string]string, error) {
	if app.BlnkMappings.DisbursementLegTxIDs == nil {
		app.BlnkMappings.DisbursementLegTxIDs = make(map[string]string)
	}

	s.recoverExistingDisburseLegs(ctx, app, legs)

	posted := make(map[string]string, len(legs))
	for _, leg := range legs {
		if leg.amount <= 0 {
			continue
		}
		if existing := app.BlnkMappings.DisbursementLegTxIDs[leg.key]; existing != "" {
			posted[leg.key] = existing
			continue
		}

		meta := map[string]any{
			"app_loan_id":     app.ID,
			"app_customer_id": app.CustomerID,
			"leg":             leg.key,
			"batch_id":        batchID,
		}
		tx, err := s.blnkCl.PostLeg(
			ctx,
			currencyPrecision,
			leg.reference,
			app.Currency,
			leg.source,
			leg.destination,
			leg.description,
			leg.amount,
			leg.inflight,
			leg.overdraft,
			true,
			meta,
		)
		if err != nil {
			if blnk.IsDuplicateReferenceError(err) {
				if existing, findErr := s.blnkCl.FindTransactionByReference(ctx, leg.reference); findErr == nil {
					tx = existing
				} else {
					return posted, fmt.Errorf("post disburse leg %s: %w", leg.key, err)
				}
			} else {
				return posted, fmt.Errorf("post disburse leg %s: %w", leg.key, err)
			}
		}
		app.BlnkMappings.DisbursementLegTxIDs[leg.key] = tx.TransactionID
		posted[leg.key] = tx.TransactionID
		if leg.key == "net" {
			app.BlnkMappings.DisbursementTransactionID = tx.TransactionID
		}
		s.linkPlatformIndicators(ctx, leg.source, leg.destination)
	}
	return posted, nil
}

func (s *loanService) linkPlatformIndicators(ctx context.Context, refs ...string) {
	plat, err := s.settingsRepo.Get(ctx)
	if err != nil || plat.PlatformIdentityID == "" {
		return
	}
	for _, ref := range refs {
		ledgersetup.TryLinkPlatformIdentity(ctx, s.blnkCl, plat.PlatformIdentityID, ref)
	}
}

// recoverExistingDisburseLegs links already-posted Blnk legs after a partial
// disburse or retry. Checks both current and legacy reference formats.
func (s *loanService) recoverExistingDisburseLegs(ctx context.Context, app *model.Application, legs []disburseLeg) {
	legacyRef := map[string]string{
		"net":         id.Ref("loan", app.ID, "disbursement", "net"),
		"origination": id.Ref("loan", app.ID, "disbursement", "origination"),
		"receivable":  id.Ref("loan", app.ID, "disbursement", "receivable"),
	}

	for _, leg := range legs {
		if leg.amount <= 0 || app.BlnkMappings.DisbursementLegTxIDs[leg.key] != "" {
			continue
		}
		for _, ref := range []string{leg.reference, legacyRef[leg.key]} {
			if ref == "" {
				continue
			}
			tx, err := s.blnkCl.FindTransactionByReference(ctx, ref)
			if err != nil {
				continue
			}
			app.BlnkMappings.DisbursementLegTxIDs[leg.key] = tx.TransactionID
			if leg.key == "net" {
				app.BlnkMappings.DisbursementTransactionID = tx.TransactionID
			}
			break
		}
	}
}

func (s *loanService) resolveDisburseBalances(
	app *model.Application,
) (funding, revenue, originationContra string, breakdown model.DisbursementBreakdown) {
	breakdown = app.DisbursementBreakdown
	if breakdown.Currency == "" {
		breakdown = model.ComputeDisbursementBreakdown(app.PrincipalCents, app.OriginationFeeBps, app.Currency)
	}

	currency := app.Currency
	return ledgersetup.FundingPoolIndicator(currency),
		ledgersetup.RevenueIndicator(currency),
		ledgersetup.LoanOriginationContraIndicator(currency),
		breakdown
}

type repayLeg struct {
	key         string
	reference   string
	source      string
	destination string
	amount      int64
	description string
}

func (s *loanService) postRepayLegs(
	ctx context.Context,
	app *model.Application,
	line *model.ScheduleLine,
	batchID string,
	legs []repayLeg,
) (map[string]string, error) {
	if line.BlnkLegTxIDs == nil {
		line.BlnkLegTxIDs = make(map[string]string)
	}

	s.recoverExistingRepayLegs(ctx, line, legs)

	posted := make(map[string]string, len(legs))
	for _, leg := range legs {
		if leg.amount <= 0 {
			continue
		}
		if existing := line.BlnkLegTxIDs[leg.key]; existing != "" {
			posted[leg.key] = existing
			continue
		}

		meta := map[string]any{
			"app_loan_id":     app.ID,
			"app_customer_id": app.CustomerID,
			"schedule_id":     line.ID,
			"leg":             leg.key,
			"batch_id":        batchID,
		}
		tx, err := s.blnkCl.PostLeg(
			ctx,
			currencyPrecision,
			leg.reference,
			app.Currency,
			leg.source,
			leg.destination,
			leg.description,
			leg.amount,
			false,
			false,
			true,
			meta,
		)
		if err != nil {
			if blnk.IsDuplicateReferenceError(err) {
				if existing, findErr := s.blnkCl.FindTransactionByReference(ctx, leg.reference); findErr == nil {
					tx = existing
				} else {
					return posted, fmt.Errorf("post repayment leg %s: %w", leg.key, err)
				}
			} else {
				return posted, fmt.Errorf("post repayment leg %s: %w", leg.key, err)
			}
		}
		line.BlnkLegTxIDs[leg.key] = tx.TransactionID
		posted[leg.key] = tx.TransactionID
		if leg.key == "principal" {
			line.BlnkTxID = tx.TransactionID
		}
		s.linkPlatformIndicators(ctx, leg.source, leg.destination)
	}
	return posted, nil
}

func (s *loanService) recoverExistingRepayLegs(ctx context.Context, line *model.ScheduleLine, legs []repayLeg) {
	for _, leg := range legs {
		if leg.amount <= 0 || line.BlnkLegTxIDs[leg.key] != "" {
			continue
		}
		tx, err := s.blnkCl.FindTransactionByReference(ctx, leg.reference)
		if err != nil {
			continue
		}
		line.BlnkLegTxIDs[leg.key] = tx.TransactionID
		if leg.key == "principal" {
			line.BlnkTxID = tx.TransactionID
		}
	}
}

func repayLegsComplete(line *model.ScheduleLine, legs []repayLeg) bool {
	if line.BlnkLegTxIDs == nil {
		return false
	}
	for _, leg := range legs {
		if leg.amount > 0 && line.BlnkLegTxIDs[leg.key] == "" {
			return false
		}
	}
	return true
}

func resolveRepayBalances(currency string) (funding, interest, fee, revenue, settlement string) {
	return ledgersetup.FundingPoolIndicator(currency),
		ledgersetup.InterestIncomeIndicator(currency),
		ledgersetup.FeeIncomeIndicator(currency),
		ledgersetup.RevenueIndicator(currency),
		ledgersetup.LoanSettlementIndicator(currency)
}

func disburseLegsComplete(app *model.Application, breakdown model.DisbursementBreakdown) bool {
	legs := app.BlnkMappings.DisbursementLegTxIDs
	if legs == nil {
		return false
	}
	if breakdown.NetDisbursementCents > 0 && legs["net"] == "" {
		return false
	}
	if breakdown.OriginationFeeCents > 0 && legs["origination"] == "" {
		return false
	}
	if breakdown.RequestedPrincipalCents > 0 && legs["receivable"] == "" {
		return false
	}
	return true
}
