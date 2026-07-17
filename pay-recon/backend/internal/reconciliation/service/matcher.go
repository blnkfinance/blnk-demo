package service

import (
	"regexp"
	"strings"
	"time"

	billmodel "github.com/blnk-demo/pay-recon/backend/internal/bills/model"
	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
	remitmodel "github.com/blnk-demo/pay-recon/backend/internal/remittances/model"
)

var payReconRefPattern = regexp.MustCompile(`PR-\d{8}-\d{4}`)

type billMatchContext struct {
	Bill            *billmodel.Bill
	MerchantAccount string
	BankPaymentDate time.Time
	BankPaymentRef  string
}

type billMatchResult struct {
	Candidates     []*model.StatementLine
	Method         string
	AmountMismatch *model.StatementLine
}

type remittanceMatchResult struct {
	Candidates     []*model.StatementLine
	Method         string
	AmountMismatch *model.StatementLine
}

func matchBillToLines(ctx billMatchContext, lines []*model.StatementLine) billMatchResult {
	if idMatches := matchByTransactionID(ctx, lines); len(idMatches) > 0 {
		return filterAmountMatches(idMatches, ctx.Bill.NetAmount, "transaction_id")
	}
	if refMatches := matchByNarrationRef(ctx, lines); len(refMatches) > 0 {
		return filterAmountMatches(refMatches, ctx.Bill.NetAmount, "narration_ref")
	}
	if candidates := matchByComposite(ctx, lines); len(candidates) > 0 {
		return billMatchResult{Candidates: candidates, Method: "composite"}
	}
	return billMatchResult{}
}

func filterAmountMatches(identityMatches []*model.StatementLine, expectedDebit int64, method string) billMatchResult {
	var amountOK []*model.StatementLine
	var amountMismatch *model.StatementLine
	for _, line := range identityMatches {
		if line.Debit == expectedDebit {
			amountOK = append(amountOK, line)
			continue
		}
		if amountMismatch == nil {
			amountMismatch = line
		}
	}
	if len(amountOK) > 0 {
		return billMatchResult{Candidates: amountOK, Method: method}
	}
	return billMatchResult{Method: method, AmountMismatch: amountMismatch}
}

func matchByTransactionID(ctx billMatchContext, lines []*model.StatementLine) []*model.StatementLine {
	ref := strings.TrimSpace(ctx.BankPaymentRef)
	if ref == "" {
		return nil
	}
	var out []*model.StatementLine
	for _, line := range lines {
		if strings.EqualFold(strings.TrimSpace(line.TransactionID), ref) {
			out = append(out, line)
		}
	}
	return out
}

func matchByNarrationRef(ctx billMatchContext, lines []*model.StatementLine) []*model.StatementLine {
	ref := strings.TrimSpace(ctx.Bill.BillReference)
	if ref == "" {
		return nil
	}
	var out []*model.StatementLine
	for _, line := range lines {
		narr := strings.TrimSpace(line.Narration)
		if narr == "" {
			continue
		}
		if strings.Contains(strings.ToUpper(narr), strings.ToUpper(ref)) {
			out = append(out, line)
			continue
		}
		found := payReconRefPattern.FindString(narr)
		if found != "" && strings.EqualFold(found, ref) {
			out = append(out, line)
		}
	}
	return out
}

func matchByComposite(ctx billMatchContext, lines []*model.StatementLine) []*model.StatementLine {
	if ctx.BankPaymentDate.IsZero() || ctx.MerchantAccount == "" {
		return nil
	}
	var out []*model.StatementLine
	for _, line := range lines {
		if line.Debit != ctx.Bill.NetAmount {
			continue
		}
		if normalizeAccount(line.BeneficiaryAccount) != ctx.MerchantAccount {
			continue
		}
		if daysApart(ctx.BankPaymentDate, line.LineDate) > 3 {
			continue
		}
		out = append(out, line)
	}
	return out
}

func daysApart(a, b time.Time) int {
	a = time.Date(a.Year(), a.Month(), a.Day(), 0, 0, 0, 0, time.UTC)
	b = time.Date(b.Year(), b.Month(), b.Day(), 0, 0, 0, 0, time.UTC)
	diff := a.Sub(b)
	if diff < 0 {
		diff = -diff
	}
	return int(diff.Hours() / 24)
}

func matchRemittanceToLines(rem *remitmodel.Remittance, lines []*model.StatementLine) remittanceMatchResult {
	if rem.BankPaymentReference != nil && strings.TrimSpace(*rem.BankPaymentReference) != "" {
		var idMatches []*model.StatementLine
		for _, line := range lines {
			if strings.EqualFold(strings.TrimSpace(line.TransactionID), strings.TrimSpace(*rem.BankPaymentReference)) {
				idMatches = append(idMatches, line)
			}
		}
		if len(idMatches) > 0 {
			return filterRemittanceAmountMatches(idMatches, rem.TotalAmount, "transaction_id")
		}
	}

	if rem.BankPaymentDate == nil {
		return remittanceMatchResult{}
	}

	var out []*model.StatementLine
	for _, line := range lines {
		if line.Debit != rem.TotalAmount {
			continue
		}
		if normalizeAccount(line.BeneficiaryAccount) != remitmodel.FIRSPaymentAccountNumber {
			continue
		}
		if daysApart(*rem.BankPaymentDate, line.LineDate) > 3 {
			continue
		}
		out = append(out, line)
	}
	return remittanceMatchResult{Candidates: out, Method: "composite"}
}

func filterRemittanceAmountMatches(identityMatches []*model.StatementLine, expectedDebit int64, method string) remittanceMatchResult {
	var amountOK []*model.StatementLine
	var amountMismatch *model.StatementLine
	for _, line := range identityMatches {
		if line.Debit == expectedDebit {
			amountOK = append(amountOK, line)
			continue
		}
		if amountMismatch == nil {
			amountMismatch = line
		}
	}
	if len(amountOK) > 0 {
		return remittanceMatchResult{Candidates: amountOK, Method: method}
	}
	return remittanceMatchResult{Method: method, AmountMismatch: amountMismatch}
}
