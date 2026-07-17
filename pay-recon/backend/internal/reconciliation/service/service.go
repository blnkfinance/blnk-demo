package service

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/bills"
	billmodel "github.com/blnk-demo/pay-recon/backend/internal/bills/model"
	"github.com/blnk-demo/pay-recon/backend/internal/blnk"
	"github.com/blnk-demo/pay-recon/backend/internal/config"
	"github.com/blnk-demo/pay-recon/backend/internal/merchants"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnkaccounts"
	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation"
	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
	"github.com/blnk-demo/pay-recon/backend/internal/remittances"
	"github.com/google/uuid"
)

type Service struct {
	repo         reconciliation.Repository
	billRepo     bills.Repository
	merchantRepo merchants.Repository
	remitRepo    remittances.Repository
	accountsRepo *blnkaccounts.Repository
	blnkCl       *blnk.Client
	cfg          config.Config
}

func New(repo reconciliation.Repository, billRepo bills.Repository, merchantRepo merchants.Repository, remitRepo remittances.Repository, accountsRepo *blnkaccounts.Repository, blnkCl *blnk.Client, cfg config.Config) reconciliation.Service {
	return &Service{repo: repo, billRepo: billRepo, merchantRepo: merchantRepo, remitRepo: remitRepo, accountsRepo: accountsRepo, blnkCl: blnkCl, cfg: cfg}
}

func (s *Service) Upload(ctx context.Context, input model.UploadStatementInput, r io.Reader) (*model.StatementUpload, error) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}

	source := strings.TrimSpace(input.Source)
	if source == "" {
		source = "mock-bank"
	}
	cadence := normalizeCadence(input.Cadence)

	uploadID := uuid.NewString()
	lines, parseErr := parseStatementCSV(uploadID, data)
	if parseErr != nil {
		return nil, parseErr
	}
	rowsRead := len(lines)

	keys := make([]string, 0, len(lines))
	for _, line := range lines {
		keys = append(keys, statementDedupeKey(source, line))
	}
	existing, err := s.repo.FindExistingDedupeKeys(ctx, keys)
	if err != nil {
		return nil, err
	}
	newLines, skipped := filterNewStatementLines(source, lines, existing)

	blnkCSV, err := buildBlnkExternalCSV(source, s.cfg.DefaultCurrency, lines)
	if err != nil {
		return nil, err
	}
	blnkUploadID := "local_" + uploadID
	blnkNote := ""
	resp, err := s.blnkCl.UploadReconciliationFile(ctx, source, "blnk_"+input.Filename, bytes.NewReader(blnkCSV))
	if err != nil {
		slog.Warn("blnk reconciliation upload failed; continuing with local matching", "error", err)
		blnkNote = "Blnk Cloud upload skipped — matching runs locally only."
	} else if resp != nil && strings.TrimSpace(resp.UploadID) != "" {
		blnkUploadID = resp.UploadID
	}

	u := &model.StatementUpload{
		ID:           uploadID,
		BlnkUploadID: blnkUploadID,
		Source:       source,
		Cadence:      cadence,
		RecordCount:  len(newLines),
		RowsRead:     rowsRead,
		RowsImported: len(newLines),
		RowsSkipped:  skipped,
		BlnkNote:     blnkNote,
		UploadedBy:   input.UploadedBy,
		UploadedAt:   time.Now().UTC(),
	}
	if err := s.repo.CreateUpload(ctx, u); err != nil {
		return nil, err
	}
	if len(newLines) > 0 {
		if err := s.repo.CreateStatementLines(ctx, u.ID, newLines); err != nil {
			return nil, err
		}
		synced, err := s.syncFundingCredits(ctx, u.ID)
		if err != nil {
			return nil, err
		}
		u.CreditsSynced = synced
	}
	return u, nil
}

func (s *Service) GetUpload(ctx context.Context, id string) (*model.StatementUpload, error) {
	u, err := s.repo.GetUpload(ctx, id)
	if err != nil {
		return nil, err
	}
	synced, err := s.repo.CountSyncedCredits(ctx, id)
	if err != nil {
		return nil, err
	}
	u.CreditsSynced = synced
	return u, nil
}

func (s *Service) StartRun(ctx context.Context, uploadID string) (*model.Run, error) {
	upload, err := s.repo.GetUpload(ctx, uploadID)
	if err != nil {
		return nil, err
	}

	blnkReconID := "local_" + uuid.NewString()
	if !strings.HasPrefix(upload.BlnkUploadID, "local_") {
		ruleAcc, ruleErr := s.accountsRepo.GetByKey(ctx, blnkaccounts.KeyMerchantMatcherRule)
		if ruleErr == nil && strings.TrimSpace(ruleAcc.BlnkRuleID) != "" {
			start, startErr := s.blnkCl.StartReconciliation(ctx, blnk.StartReconciliationRequest{
				UploadID:        upload.BlnkUploadID,
				Strategy:        "one_to_one",
				MatchingRuleIDs: []string{ruleAcc.BlnkRuleID},
			})
			if startErr != nil {
				slog.Warn("blnk reconciliation start failed; continuing with local matching", "error", startErr)
			} else if start != nil && strings.TrimSpace(start.ReconciliationID) != "" {
				blnkReconID = start.ReconciliationID
			}
		}
	}

	run := &model.Run{
		ID:                   uuid.NewString(),
		BlnkReconciliationID: blnkReconID,
		StatementUploadID:    upload.ID,
		Strategy:             "one_to_one",
		Status:               "pending",
		StartedAt:            time.Now().UTC(),
	}
	if err := s.repo.CreateRun(ctx, run); err != nil {
		return nil, err
	}

	// Local matching is fast; process inline so the UI redirect shows final counts.
	if err := s.ProcessRun(ctx, run.ID); err != nil {
		slog.Error("reconciliation process failed", "run_id", run.ID, "error", err)
	}
	return s.repo.GetRun(ctx, run.ID)
}

func (s *Service) ProcessRun(ctx context.Context, runID string) error {
	run, err := s.repo.GetRun(ctx, runID)
	if err != nil {
		return err
	}

	fail := func(processErr error) error {
		now := time.Now().UTC()
		run.Status = "failed"
		run.CompletedAt = &now
		if updErr := s.repo.UpdateRun(ctx, run); updErr != nil {
			slog.Error("mark reconciliation failed", "run_id", run.ID, "error", updErr)
		}
		return processErr
	}

	// Optional: wait for Blnk Cloud recon if we started one. Matching itself is local.
	if !strings.HasPrefix(run.BlnkReconciliationID, "local_") {
		var recon *blnk.Reconciliation
		for i := 0; i < 30; i++ {
			recon, err = s.blnkCl.GetReconciliation(ctx, run.BlnkReconciliationID)
			if err != nil {
				slog.Warn("blnk reconciliation poll failed; running local match", "error", err)
				break
			}
			if recon.Status == "completed" || recon.Status == "failed" {
				break
			}
			time.Sleep(2 * time.Second)
		}
	}

	matched, unmatched, err := s.matchBillsToStatement(ctx, run)
	if err != nil {
		return fail(err)
	}

	now := time.Now().UTC()
	run.CompletedAt = &now
	run.MatchedCount = &matched
	run.UnmatchedCount = &unmatched
	run.Status = "completed"
	if err := s.repo.UpdateRun(ctx, run); err != nil {
		return fail(err)
	}
	return nil
}

func (s *Service) matchBillsToStatement(ctx context.Context, run *model.Run) (matched int, unmatched int, err error) {
	lines, err := s.repo.ListUnmatchedLinesByUpload(ctx, run.StatementUploadID)
	if err != nil {
		return 0, 0, err
	}

	billIDs, err := s.repo.ListAwaitingPaymentBills(ctx)
	if err != nil {
		return 0, 0, err
	}

	usedLines := map[string]bool{}

	for _, billID := range billIDs {
		bill, err := s.billRepo.GetByID(ctx, billID)
		if err != nil {
			continue
		}
		merchant, err := s.merchantRepo.GetByID(ctx, bill.MerchantID)
		if err != nil {
			continue
		}

		ctxMatch := billMatchContext{
			Bill:            bill,
			MerchantAccount: normalizeAccount(merchant.BankAccountNumber),
			BankPaymentRef:  derefString(bill.BankPaymentReference),
		}
		if bill.BankPaymentDate != nil {
			ctxMatch.BankPaymentDate = *bill.BankPaymentDate
		}

		available := make([]*model.StatementLine, 0, len(lines))
		for _, line := range lines {
			if !usedLines[line.ID] {
				available = append(available, line)
			}
		}

		result := matchBillToLines(ctxMatch, available)
		if result.AmountMismatch != nil && len(result.Candidates) == 0 {
			unmatched++
			line := result.AmountMismatch
			usedLines[line.ID] = true
			_ = s.repo.CreateException(ctx, &model.Exception{
				ID:                  uuid.NewString(),
				ReconciliationRunID: run.ID,
				ExceptionType:       model.ExceptionAmountMismatch,
				BillID:              &bill.ID,
				ExternalRecord: map[string]any{
					"transaction_id":      line.TransactionID,
					"expected_net_amount": bill.NetAmount,
					"bank_debit":          line.Debit,
					"match_method":        result.Method,
					"beneficiary_account": line.BeneficiaryAccount,
					"line_date":           line.LineDate.Format("2006-01-02"),
				},
				CreatedAt: time.Now().UTC(),
			})
			continue
		}
		switch len(result.Candidates) {
		case 0:
			unmatched++
			_ = s.repo.CreateException(ctx, &model.Exception{
				ID:                  uuid.NewString(),
				ReconciliationRunID: run.ID,
				ExceptionType:       model.ExceptionUnmatchedBill,
				BillID:              &bill.ID,
				CreatedAt:           time.Now().UTC(),
			})
		case 1:
			line := result.Candidates[0]
			// Mark bill paid first so a failed status update does not leave the line claimed.
			if err := s.billRepo.MarkPaid(ctx, bill.ID); err != nil {
				slog.Warn("mark bill paid failed", "bill_id", bill.ID, "error", err)
				unmatched++
				continue
			}
			if err := s.repo.MarkLineMatched(ctx, line.ID, bill.ID); err != nil {
				slog.Warn("mark statement line matched failed", "line_id", line.ID, "bill_id", bill.ID, "error", err)
			}
			usedLines[line.ID] = true
			matched++
		default:
			unmatched++
			ext := map[string]any{
				"candidate_line_ids": lineIDs(result.Candidates),
			}
			_ = s.repo.CreateException(ctx, &model.Exception{
				ID:                  uuid.NewString(),
				ReconciliationRunID: run.ID,
				ExceptionType:       model.ExceptionAmbiguousMatch,
				BillID:              &bill.ID,
				ExternalRecord:      ext,
				CreatedAt:           time.Now().UTC(),
			})
		}
	}

	remittances, err := s.remitRepo.ListPaidUnreconciled(ctx)
	if err != nil {
		return matched, unmatched, err
	}
	for _, rem := range remittances {
		available := make([]*model.StatementLine, 0, len(lines))
		for _, line := range lines {
			if !usedLines[line.ID] {
				available = append(available, line)
			}
		}

		result := matchRemittanceToLines(rem, available)
		if result.AmountMismatch != nil && len(result.Candidates) == 0 {
			unmatched++
			line := result.AmountMismatch
			usedLines[line.ID] = true
			_ = s.repo.CreateException(ctx, &model.Exception{
				ID:                  uuid.NewString(),
				ReconciliationRunID: run.ID,
				ExceptionType:       model.ExceptionAmountMismatch,
				ExternalRecord: map[string]any{
					"remittance_id":       rem.ID,
					"period":              rem.Period,
					"transaction_id":      line.TransactionID,
					"expected_amount":     rem.TotalAmount,
					"bank_debit":          line.Debit,
					"match_method":        result.Method,
					"beneficiary_account": line.BeneficiaryAccount,
					"line_date":           line.LineDate.Format("2006-01-02"),
				},
				CreatedAt: time.Now().UTC(),
			})
			continue
		}
		switch len(result.Candidates) {
		case 0:
			unmatched++
			_ = s.repo.CreateException(ctx, &model.Exception{
				ID:                  uuid.NewString(),
				ReconciliationRunID: run.ID,
				ExceptionType:       model.ExceptionUnmatchedRemittance,
				ExternalRecord: map[string]any{
					"remittance_id": rem.ID,
					"period":        rem.Period,
					"amount":        rem.TotalAmount,
				},
				CreatedAt: time.Now().UTC(),
			})
		case 1:
			line := result.Candidates[0]
			if err := s.remitRepo.MarkRemitted(ctx, rem.ID); err != nil {
				slog.Warn("mark remittance remitted failed", "remittance_id", rem.ID, "error", err)
				unmatched++
				continue
			}
			if err := s.repo.MarkLineMatchedRemittance(ctx, line.ID, rem.ID); err != nil {
				slog.Warn("mark statement line matched remittance failed", "line_id", line.ID, "remittance_id", rem.ID, "error", err)
			}
			usedLines[line.ID] = true
			matched++
		default:
			unmatched++
			_ = s.repo.CreateException(ctx, &model.Exception{
				ID:                  uuid.NewString(),
				ReconciliationRunID: run.ID,
				ExceptionType:       model.ExceptionAmbiguousMatch,
				ExternalRecord: map[string]any{
					"remittance_id":      rem.ID,
					"candidate_line_ids": lineIDs(result.Candidates),
				},
				CreatedAt: time.Now().UTC(),
			})
		}
	}

	for _, line := range lines {
		if usedLines[line.ID] {
			continue
		}
		if line.Debit == 0 {
			continue
		}
		unmatched++
		ext := map[string]any{
			"transaction_id":      line.TransactionID,
			"narration":           line.Narration,
			"beneficiary_account": line.BeneficiaryAccount,
			"debit":               line.Debit,
			"line_date":           line.LineDate.Format("2006-01-02"),
		}
		_ = s.repo.CreateException(ctx, &model.Exception{
			ID:                  uuid.NewString(),
			ReconciliationRunID: run.ID,
			ExceptionType:       model.ExceptionUnmatchedBankLine,
			ExternalRecord:      ext,
			CreatedAt:           time.Now().UTC(),
		})
	}

	return matched, unmatched, nil
}

func lineIDs(lines []*model.StatementLine) []string {
	out := make([]string, len(lines))
	for i, line := range lines {
		out[i] = line.ID
	}
	return out
}

func derefString(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}

func (s *Service) GetRun(ctx context.Context, id string) (*model.Run, error) {
	return s.repo.GetRun(ctx, id)
}

func (s *Service) ListRuns(ctx context.Context) ([]*model.Run, error) {
	return s.repo.ListRuns(ctx)
}

func (s *Service) ListExceptions(ctx context.Context, runID string) ([]*model.Exception, error) {
	return s.repo.ListExceptions(ctx, runID)
}

func (s *Service) ResolveException(ctx context.Context, id string, input model.ResolveExceptionInput) error {
	ex, err := s.repo.GetException(ctx, id)
	if err != nil {
		return err
	}
	if err := s.repo.ResolveException(ctx, id, input.ResolutionNote); err != nil {
		return err
	}
	if input.BillID != nil && (ex.ExceptionType == model.ExceptionUnmatchedBill || ex.ExceptionType == model.ExceptionAmbiguousMatch) {
		bill, err := s.billRepo.GetByID(ctx, *input.BillID)
		if err != nil {
			return err
		}
		if bill.Status == billmodel.StatusPaidUnreconciled {
			return s.billRepo.MarkPaid(ctx, bill.ID)
		}
	}
	return nil
}
