package model

import "time"

// Balance mirrors the Blnk balance response shape.
// All amounts are stored as integers with an associated precision (e.g. 100 = cents).
type Balance struct {
	BalanceID             string         `json:"balance_id"`
	LedgerID              string         `json:"ledger_id"`
	IdentityID            string         `json:"identity_id,omitempty"`
	Indicator             string         `json:"indicator,omitempty"`
	Currency              string         `json:"currency"`
	Precision             int64          `json:"precision"`
	Balance               int64          `json:"balance"`
	CreditBalance         int64          `json:"credit_balance"`
	DebitBalance          int64          `json:"debit_balance"`
	InflightBalance       int64          `json:"inflight_balance"`
	InflightCreditBalance int64          `json:"inflight_credit_balance"`
	InflightDebitBalance  int64          `json:"inflight_debit_balance"`
	QueuedCreditBalance   int64          `json:"queued_credit_balance,omitempty"`
	QueuedDebitBalance    int64          `json:"queued_debit_balance,omitempty"`
	MetaData              map[string]any `json:"meta_data,omitempty"`
	CreatedAt             time.Time      `json:"created_at"`
}
