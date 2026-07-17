package model

import "time"

type Remittance struct {
	ID                   string     `json:"id"`
	Period               string     `json:"period"`
	TotalAmount          int64      `json:"total_amount"`
	BlnkTxnID            string     `json:"blnk_txn_id"`
	Status               string     `json:"status"`
	BankPaymentReference *string    `json:"bank_payment_reference,omitempty"`
	BankPaymentDate      *time.Time `json:"bank_payment_date,omitempty"`
	PaymentConfirmedAt   *time.Time `json:"payment_confirmed_at,omitempty"`
	PaymentNote          *string    `json:"payment_note,omitempty"`
	RemittedAt           *time.Time `json:"remitted_at,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
}

type CreateRemittanceInput struct {
	Period string `json:"period"`
}

type ConfirmRemittanceInput struct {
	BankPaymentReference string `json:"bank_payment_reference"`
	BankPaymentDate      string `json:"bank_payment_date"`
	PaymentNote          string `json:"payment_note,omitempty"`
}

const (
	StatusAwaitingPayment  = "awaiting_payment"
	StatusPaidUnreconciled = "paid_unreconciled"
	StatusRemitted         = "remitted"
)

const (
	FIRSPaymentAccountNumber = "FIRS-WHT-001"
	FIRSPaymentBankName      = "Federal Inland Revenue Service"
)
