package service

import (
	"testing"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
)

func TestStatementDedupeKeyUsesTransactionID(t *testing.T) {
	line := &model.StatementLine{
		TransactionID: "bnk-20260715-0001",
		LineDate:      time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC),
		Debit:         19000000,
	}
	got := statementDedupeKey("mock-bank", line)
	want := "mock-bank|txn|BNK-20260715-0001"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestStatementDedupeKeyFingerprintWhenNoTransactionID(t *testing.T) {
	line := &model.StatementLine{
		LineDate:           time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC),
		Debit:              500000,
		Credit:             0,
		BeneficiaryAccount: "FIRS-WHT-001",
		Narration:          "WHT 2026-07",
	}
	got := statementDedupeKey("mock-bank", line)
	want := "mock-bank|fp|2026-07-15|500000|0|FIRS-WHT-001|WHT 2026-07"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestFilterNewStatementLinesSkipsDuplicates(t *testing.T) {
	line := &model.StatementLine{
		TransactionID: "BNK-1",
		LineDate:      time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC),
		Debit:         100,
	}
	existing := map[string]bool{
		statementDedupeKey("mock-bank", line): true,
	}

	newLines, skipped := filterNewStatementLines("mock-bank", []*model.StatementLine{line, line}, existing)
	if len(newLines) != 0 {
		t.Fatalf("expected 0 new lines, got %d", len(newLines))
	}
	if skipped != 2 {
		t.Fatalf("expected 2 skipped, got %d", skipped)
	}
}
