package service

import (
	"testing"
	"time"

	billmodel "github.com/blnk-demo/pay-recon/backend/internal/bills/model"
	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
	remitmodel "github.com/blnk-demo/pay-recon/backend/internal/remittances/model"
)

func TestMatchBillToLinesRejectsAmountMismatchOnTxnID(t *testing.T) {
	bill := &billmodel.Bill{
		BillReference: "PR-20260716-0001",
		NetAmount:     190000000,
	}
	line := &model.StatementLine{
		ID:            "line-1",
		TransactionID: "BNK-1",
		Debit:         200000000,
		LineDate:      time.Date(2026, 7, 16, 0, 0, 0, 0, time.UTC),
	}
	result := matchBillToLines(billMatchContext{
		Bill:           bill,
		BankPaymentRef: "BNK-1",
	}, []*model.StatementLine{line})

	if len(result.Candidates) != 0 {
		t.Fatalf("expected no candidates, got %d", len(result.Candidates))
	}
	if result.AmountMismatch == nil {
		t.Fatal("expected amount mismatch")
	}
	if result.AmountMismatch.Debit != 200000000 {
		t.Fatalf("unexpected mismatch debit %d", result.AmountMismatch.Debit)
	}
}

func TestMatchBillToLinesAcceptsMatchingAmountOnTxnID(t *testing.T) {
	bill := &billmodel.Bill{
		BillReference: "PR-20260716-0001",
		NetAmount:     190000000,
	}
	line := &model.StatementLine{
		ID:            "line-1",
		TransactionID: "BNK-1",
		Debit:         190000000,
		LineDate:      time.Date(2026, 7, 16, 0, 0, 0, 0, time.UTC),
	}
	result := matchBillToLines(billMatchContext{
		Bill:           bill,
		BankPaymentRef: "BNK-1",
	}, []*model.StatementLine{line})

	if len(result.Candidates) != 1 {
		t.Fatalf("expected 1 candidate, got %d", len(result.Candidates))
	}
	if result.AmountMismatch != nil {
		t.Fatal("expected no amount mismatch")
	}
}

func TestMatchRemittanceToLinesRejectsAmountMismatch(t *testing.T) {
	ref := "BNK-FIRS-1"
	rem := &remitmodel.Remittance{
		TotalAmount:          5000000,
		BankPaymentReference: &ref,
	}
	line := &model.StatementLine{
		ID:            "line-1",
		TransactionID: ref,
		Debit:         4000000,
	}
	result := matchRemittanceToLines(rem, []*model.StatementLine{line})
	if len(result.Candidates) != 0 {
		t.Fatalf("expected no candidates, got %d", len(result.Candidates))
	}
	if result.AmountMismatch == nil {
		t.Fatal("expected amount mismatch")
	}
}
