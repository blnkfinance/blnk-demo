package model

import "time"

const (
	StatusAwaitingPayment  = "awaiting_payment"
	StatusPaidUnreconciled = "paid_unreconciled"
	StatusPaidReconciled   = "paid_reconciled"
	StatusPaid             = StatusPaidReconciled
	StatusOverdue          = "overdue"
	StatusCancelled        = "cancelled"
	StatusFailed           = "failed"
)

const MaxBillReferenceLen = 20

type Bill struct {
	ID                   string     `json:"id"`
	BillReference        string     `json:"bill_reference"`
	VendorInvoiceRef     *string    `json:"vendor_invoice_ref,omitempty"`
	MerchantID           string     `json:"merchant_id"`
	WHTCategoryID        string     `json:"wht_category_id"`
	Purpose              string     `json:"purpose"`
	GrossAmount          int64      `json:"gross_amount"`
	WHTRate              string     `json:"wht_rate"`
	WHTAmount            int64      `json:"wht_amount"`
	NetAmount            int64      `json:"net_amount"`
	Currency             string     `json:"currency"`
	AttachmentURL        *string    `json:"attachment_url,omitempty"`
	Status               string     `json:"status"`
	BankPaymentReference *string    `json:"bank_payment_reference,omitempty"`
	BankPaymentDate      *time.Time `json:"bank_payment_date,omitempty"`
	PaymentConfirmedAt   *time.Time `json:"payment_confirmed_at,omitempty"`
	PaymentConfirmedBy   *string    `json:"payment_confirmed_by,omitempty"`
	PaymentNote          *string    `json:"payment_note,omitempty"`
	BlnkNetTxnID         string     `json:"blnk_net_txn_id"`
	BlnkWHTTxnID         string     `json:"blnk_wht_txn_id"`
	CreatedBy            string     `json:"created_by"`
	CreatedAt            time.Time  `json:"created_at"`
	PaidAt               *time.Time `json:"paid_at,omitempty"`
}

type CreateBillInput struct {
	BillReference    string `json:"bill_reference,omitempty"`
	VendorInvoiceRef string `json:"vendor_invoice_ref,omitempty"`
	MerchantID       string `json:"merchant_id"`
	WHTCategoryID    string `json:"wht_category_id"`
	Purpose          string `json:"purpose"`
	GrossAmount      int64  `json:"gross_amount"`
	AttachmentURL    string `json:"attachment_url,omitempty"`
}

type ConfirmPaymentInput struct {
	BankPaymentReference string `json:"bank_payment_reference"`
	BankPaymentDate      string `json:"bank_payment_date"`
	PaymentNote          string `json:"payment_note,omitempty"`
}

type ListFilter struct {
	Status     string
	MerchantID string
	From       *time.Time
	To         *time.Time
}

type PaymentInstruction struct {
	AccountNumber string `json:"account_number"`
	BankName      string `json:"bank_name"`
	Amount        int64  `json:"amount"`
	Narration     string `json:"narration"`
	Currency      string `json:"currency"`
}

type CreateBillResponse struct {
	Bill               *Bill               `json:"bill"`
	PaymentInstruction *PaymentInstruction `json:"payment_instruction"`
}
