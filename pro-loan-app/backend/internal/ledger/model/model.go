package model

import "time"

type OperationStatus string

const (
	OperationPending  OperationStatus = "pending"
	OperationPosted   OperationStatus = "posted"
	OperationInflight OperationStatus = "inflight"
	OperationRejected OperationStatus = "rejected"
	OperationFailed   OperationStatus = "failed"
)

type OperationKind string

const (
	KindDisbursement     OperationKind = "disbursement"
	KindRepayment        OperationKind = "repayment"
	KindInterestAccrual  OperationKind = "interest_accrual"
	KindFee              OperationKind = "fee"
	KindReversal         OperationKind = "reversal"
	KindTreasuryPrefund  OperationKind = "treasury_prefund"
)

// Operation is a local record of a single Blnk ledger posting.
// It carries the Blnk transaction IDs needed for reconciliation and retry.
type Operation struct {
	ID                string          `bson:"_id" json:"id"`
	LoanID            string          `bson:"loan_id" json:"loan_id"`
	Kind              OperationKind   `bson:"kind" json:"kind"`
	Reference         string          `bson:"reference" json:"reference"`
	Status            OperationStatus `bson:"status" json:"status"`
	AmountCents       int64           `bson:"amount_cents" json:"amount_cents"`
	Currency          string          `bson:"currency" json:"currency"`
	BlnkTransactionID string          `bson:"blnk_transaction_id,omitempty" json:"blnk_transaction_id,omitempty"`
	ParentTransaction string          `bson:"parent_transaction,omitempty" json:"parent_transaction,omitempty"`
	BatchID           string          `bson:"batch_id,omitempty" json:"batch_id,omitempty"`
	RetryCount        int             `bson:"retry_count" json:"retry_count"`
	LastError         string          `bson:"last_error,omitempty" json:"last_error,omitempty"`
	CreatedAt         time.Time       `bson:"created_at" json:"created_at"`
	UpdatedAt         time.Time       `bson:"updated_at" json:"updated_at"`
}

type RecordInput struct {
	LoanID      string
	Kind        OperationKind
	Reference   string
	AmountCents int64
	Currency    string
}
