package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/blnk-demo/pay-recon/backend/internal/blnk"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnksetup"
	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
)

func (s *Service) syncFundingCredits(ctx context.Context, uploadID string) (int, error) {
	lines, err := s.repo.ListUnsyncedCreditLines(ctx, uploadID)
	if err != nil {
		return 0, err
	}
	if len(lines) == 0 {
		return 0, nil
	}

	bankInflow, err := blnksetup.BankInflowIndicator(ctx, s.accountsRepo)
	if err != nil {
		return 0, err
	}
	operating, err := blnksetup.OperatingIndicator(ctx, s.accountsRepo)
	if err != nil {
		return 0, err
	}

	currency := strings.ToUpper(strings.TrimSpace(s.cfg.DefaultCurrency))
	synced := 0

	for _, line := range lines {
		if !isFundingCredit(line) {
			// Mark non-funding credits synced so we do not retry them forever.
			if err := s.repo.MarkLineLedgerSynced(ctx, line.ID); err != nil {
				return synced, err
			}
			continue
		}
		ref := fundingReference(line)
		narration := strings.TrimSpace(line.Narration)
		if narration == "" {
			narration = "Bank account funding"
		}
		// BankInflow is an external source at 0; allow_overdraft lets cash enter @OperatingAccount.
		_, err := s.blnkCl.PostLeg(ctx, ref, currency, bankInflow, operating, narration, line.Credit, false, true, true, map[string]any{
			"type":                "bank_cash_sync",
			"bank_transaction_id": line.TransactionID,
			"statement_line_id":   line.ID,
			"upload_id":           uploadID,
		})
		if err != nil && !blnk.IsDuplicateReferenceError(err) {
			return synced, fmt.Errorf("sync funding credit %s: %w", ref, err)
		}
		if err := s.repo.MarkLineLedgerSynced(ctx, line.ID); err != nil {
			return synced, err
		}
		synced++
	}

	return synced, nil
}

func isFundingCredit(line *model.StatementLine) bool {
	if line == nil || line.Credit <= 0 || line.Debit > 0 {
		return false
	}
	txn := strings.ToUpper(strings.TrimSpace(line.TransactionID))
	if strings.HasPrefix(txn, "FND-") {
		return true
	}
	narr := strings.ToLower(line.Narration)
	if strings.Contains(narr, "fund") || strings.Contains(narr, "top up") || strings.Contains(narr, "top-up") || strings.Contains(narr, "deposit") {
		return true
	}
	// Credit with no outbound beneficiary is treated as inbound funding.
	return strings.TrimSpace(line.BeneficiaryAccount) == "" ||
		strings.EqualFold(strings.TrimSpace(line.BeneficiaryAccount), "HB-OPERATING-001")
}

func fundingReference(line *model.StatementLine) string {
	if txn := strings.TrimSpace(line.TransactionID); txn != "" {
		return "bank_fund_" + txn
	}
	return "bank_fund_line_" + line.ID
}
