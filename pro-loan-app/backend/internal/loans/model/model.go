package model

import "time"

type Status string

const (
	StatusDraft     Status = "draft"
	StatusSubmitted Status = "submitted"
	StatusApproved  Status = "approved"
	StatusRejected  Status = "rejected"
	StatusActive    Status = "active"
	StatusClosed    Status = "closed"
	StatusDefaulted Status = "defaulted"
)

type ScheduleStatus string

const (
	ScheduleScheduled ScheduleStatus = "scheduled"
	ScheduleDue       ScheduleStatus = "due"
	SchedulePaid      ScheduleStatus = "paid"
	ScheduleOverdue   ScheduleStatus = "overdue"
	ScheduleVoid      ScheduleStatus = "void"
)

// Application represents a loan application through its full lifecycle.
// Product terms (rate, fee, currency) are copied from the product at apply time
// so the loan record is self-contained even if the product is later updated.
type Application struct {
	ID                string         `bson:"_id"            json:"id"`
	CustomerID        string         `bson:"customer_id"    json:"customer_id"`
	ProductID         string         `bson:"product_id"     json:"product_id"`
	Status            Status         `bson:"status"         json:"status"`
	PrincipalCents    int64          `bson:"principal_cents" json:"principal_cents"`
	Currency          string         `bson:"currency"       json:"currency"`
	TermMonths        int            `bson:"term_months"    json:"term_months"`
	AnnualInterestBps int64          `bson:"annual_interest_bps" json:"annual_interest_bps"`
	OriginationFeeBps int64          `bson:"origination_fee_bps" json:"origination_fee_bps"`
	RejectionNote         string                `bson:"rejection_note,omitempty" json:"rejection_note,omitempty"`
	DisbursementBreakdown DisbursementBreakdown `bson:"disbursement_breakdown,omitempty" json:"disbursement_breakdown,omitempty"`
	BlnkMappings          BlnkMappings          `bson:"blnk_mappings"  json:"blnk_mappings"`
	Schedule          []ScheduleLine `bson:"schedule"       json:"schedule"`
	CreatedAt         time.Time      `bson:"created_at"     json:"created_at"`
	UpdatedAt         time.Time      `bson:"updated_at"     json:"updated_at"`
	ApprovedAt        *time.Time     `bson:"approved_at,omitempty"   json:"approved_at,omitempty"`
	RejectedAt        *time.Time     `bson:"rejected_at,omitempty"   json:"rejected_at,omitempty"`
	DisbursedAt       *time.Time     `bson:"disbursed_at,omitempty"  json:"disbursed_at,omitempty"`
	CommittedAt       *time.Time     `bson:"committed_at,omitempty"  json:"committed_at,omitempty"`
	ClosedAt          *time.Time     `bson:"closed_at,omitempty"     json:"closed_at,omitempty"`
}

type ScheduleLine struct {
	ID             string         `bson:"id"              json:"id"`
	DueDate        time.Time      `bson:"due_date"        json:"due_date"`
	PrincipalCents int64          `bson:"principal_cents" json:"principal_cents"`
	InterestCents  int64          `bson:"interest_cents"  json:"interest_cents"`
	FeeCents       int64          `bson:"fee_cents"       json:"fee_cents"`
	Status         ScheduleStatus `bson:"status"          json:"status"`
	PaidAt         *time.Time     `bson:"paid_at,omitempty" json:"paid_at,omitempty"`
	BlnkTxID       string         `bson:"blnk_tx_id,omitempty" json:"blnk_tx_id,omitempty"`
	BlnkLegTxIDs   map[string]string `bson:"blnk_leg_tx_ids,omitempty" json:"blnk_leg_tx_ids,omitempty"`
}

type BlnkMappings struct {
	IdentityID                string            `bson:"identity_id,omitempty"                 json:"identity_id,omitempty"`
	LoanBalanceID             string            `bson:"loan_balance_id,omitempty"             json:"loan_balance_id,omitempty"`
	ReceivableLedgerID        string            `bson:"receivable_ledger_id,omitempty"        json:"receivable_ledger_id,omitempty"`
	DisbursementTransactionID string            `bson:"disbursement_transaction_id,omitempty" json:"disbursement_transaction_id,omitempty"`
	DisbursementLegTxIDs      map[string]string `bson:"disbursement_leg_tx_ids,omitempty"     json:"disbursement_leg_tx_ids,omitempty"`
	RepaymentBatchIDs         []string          `bson:"repayment_batch_ids,omitempty"         json:"repayment_batch_ids,omitempty"`
}

type CreateApplicationInput struct {
	CustomerID     string `json:"customer_id"`
	ProductID      string `json:"product_id"`
	PrincipalCents int64  `json:"principal_cents"`
	TermMonths     int    `json:"term_months"`
}

type ListFilter struct {
	CustomerID string
	Status     Status
	Statuses   []Status
	Page       int
	PageSize   int
}
