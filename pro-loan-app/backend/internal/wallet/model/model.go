package model

import "time"

type TxType string

const (
	TxLoanDisbursement TxType = "loan_disbursement"
	TxLoanRepayment    TxType = "loan_repayment"
	TxTransferSent     TxType = "transfer_sent"
	TxTransferReceived TxType = "transfer_received"
	TxFee              TxType = "fee"
)

// WalletTransaction records a single wallet operation in the local ledger.
type WalletTransaction struct {
	ID           string    `bson:"_id" json:"id"`
	CustomerID   string    `bson:"customer_id" json:"customer_id"`
	Type         TxType    `bson:"type" json:"type"`
	AmountCents  int64     `bson:"amount_cents" json:"amount_cents"`
	Currency     string    `bson:"currency" json:"currency"`
	Description  string    `bson:"description" json:"description"`
	Reference    string    `bson:"reference" json:"reference"`
	BalanceAfter float64   `bson:"balance_after,omitempty" json:"balance_after,omitempty"`
	Counterparty string    `bson:"counterparty,omitempty" json:"counterparty,omitempty"`
	BlnkTxID     string    `bson:"blnk_tx_id,omitempty" json:"blnk_tx_id,omitempty"`
	CreatedAt    time.Time `bson:"created_at" json:"created_at"`
}

type RecordInput struct {
	CustomerID   string
	Type         TxType
	AmountCents  int64
	Currency     string
	Description  string
	Reference    string
	BalanceAfter float64
	Counterparty string
	BlnkTxID     string
}
