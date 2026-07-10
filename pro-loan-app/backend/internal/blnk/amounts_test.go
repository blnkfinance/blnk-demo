package blnk

import (
	"encoding/json"
	"testing"
)

func TestTransactionUnmarshalFloatAmount(t *testing.T) {
	raw := `{
		"transaction_id": "txn_123",
		"amount": 1137.84,
		"precise_amount": 113784,
		"precision": 100,
		"currency": "USD"
	}`

	var tx Transaction
	if err := json.Unmarshal([]byte(raw), &tx); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if tx.TransactionID != "txn_123" {
		t.Fatalf("transaction_id = %q", tx.TransactionID)
	}
	if tx.Amount != 1137.84 {
		t.Fatalf("amount = %v, want 1137.84", tx.Amount)
	}
	if tx.PreciseAmount != 113784 {
		t.Fatalf("precise_amount = %d", tx.PreciseAmount)
	}
}

func TestBalanceUnmarshalFloatBalance(t *testing.T) {
	raw := `{"balance_id":"bal_1","balance":7500.5,"currency":"USD"}`

	var b Balance
	if err := json.Unmarshal([]byte(raw), &b); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if b.Balance != 7500.5 {
		t.Fatalf("balance = %v", b.Balance)
	}
	if b.BalanceMinorUnits() != 7501 {
		t.Fatalf("minor units = %d", b.BalanceMinorUnits())
	}
}
