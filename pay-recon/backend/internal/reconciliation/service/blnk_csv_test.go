package service

import (
	"strings"
	"testing"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
)

func TestBuildBlnkExternalCSV(t *testing.T) {
	lines := []*model.StatementLine{
		{
			ID:            "line-1",
			TransactionID: "BNK-1",
			Narration:     "Fund account",
			Credit:        15000000,
			LineDate:      time.Date(2026, 7, 17, 0, 0, 0, 0, time.UTC),
		},
		{
			ID:            "line-2",
			TransactionID: "BNK-2",
			Narration:     "Vendor pay",
			Debit:         9500000,
			LineDate:      time.Date(2026, 7, 17, 0, 0, 0, 0, time.UTC),
		},
	}
	raw, err := buildBlnkExternalCSV("mock-bank", "NGN", lines)
	if err != nil {
		t.Fatal(err)
	}
	out := string(raw)
	if !strings.Contains(out, "id,amount,reference,currency,description,date,source") {
		t.Fatalf("missing header: %s", out)
	}
	if !strings.Contains(out, "BNK-1,150000.00,BNK-1,NGN,Fund account,2026-07-17T00:00:00Z,mock-bank") {
		t.Fatalf("missing credit row: %s", out)
	}
	if !strings.Contains(out, "BNK-2,95000.00,BNK-2,NGN,Vendor pay,2026-07-17T00:00:00Z,mock-bank") {
		t.Fatalf("missing debit row: %s", out)
	}
}
