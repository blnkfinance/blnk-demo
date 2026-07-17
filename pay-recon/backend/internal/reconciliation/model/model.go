package model

import "time"

type StatementLine struct {
	ID                  string    `json:"id"`
	UploadID            string    `json:"upload_id"`
	DedupeKey           string    `json:"dedupe_key,omitempty"`
	TransactionID       string    `json:"transaction_id"`
	Narration           string    `json:"narration"`
	BeneficiaryAccount  string    `json:"beneficiary_account"`
	Debit               int64     `json:"debit"`
	Credit              int64     `json:"credit"`
	Balance             int64     `json:"balance"`
	LineDate            time.Time `json:"line_date"`
	MatchedBillID       *string   `json:"matched_bill_id,omitempty"`
	MatchedRemittanceID *string   `json:"matched_remittance_id,omitempty"`
	LedgerSynced        bool      `json:"ledger_synced"`
	CreatedAt           time.Time `json:"created_at"`
}

type StatementUpload struct {
	ID             string    `json:"id"`
	BlnkUploadID   string    `json:"blnk_upload_id"`
	Source         string    `json:"source"`
	Cadence        string    `json:"cadence"`
	RecordCount    int       `json:"record_count"`
	RowsRead       int       `json:"rows_read"`
	RowsImported   int       `json:"rows_imported"`
	RowsSkipped    int       `json:"rows_skipped"`
	CreditsSynced  int       `json:"credits_synced"`
	BlnkNote       string    `json:"blnk_note,omitempty"`
	UploadedBy     string    `json:"uploaded_by"`
	UploadedAt     time.Time `json:"uploaded_at"`
}

const (
	CadenceDaily   = "daily"
	CadenceWeekly  = "weekly"
	CadenceMonthly = "monthly"
)

type Run struct {
	ID                   string     `json:"id"`
	BlnkReconciliationID string     `json:"blnk_reconciliation_id"`
	StatementUploadID    string     `json:"statement_upload_id"`
	Strategy             string     `json:"strategy"`
	MatchedCount         *int       `json:"matched_count,omitempty"`
	UnmatchedCount       *int       `json:"unmatched_count,omitempty"`
	Status               string     `json:"status"`
	StartedAt            time.Time  `json:"started_at"`
	CompletedAt          *time.Time `json:"completed_at,omitempty"`
}

type Exception struct {
	ID                  string         `json:"id"`
	ReconciliationRunID string         `json:"reconciliation_run_id"`
	ExceptionType       string         `json:"exception_type"`
	BillID              *string        `json:"bill_id,omitempty"`
	ExternalRecord      map[string]any `json:"external_record,omitempty"`
	Resolved            bool           `json:"resolved"`
	ResolutionNote      *string        `json:"resolution_note,omitempty"`
	CreatedAt           time.Time      `json:"created_at"`
}

const (
	ExceptionUnmatchedBill       = "unmatched_bill"
	ExceptionUnmatchedRemittance = "unmatched_remittance"
	ExceptionUnmatchedBankLine   = "unmatched_bank_line"
	ExceptionAmbiguousMatch      = "ambiguous_match"
	ExceptionAmountMismatch      = "amount_mismatch"
)

type StartRunInput struct {
	UploadID string `json:"upload_id"`
}

type UploadStatementInput struct {
	Source     string
	Filename   string
	UploadedBy string
	Cadence    string
}

type ResolveExceptionInput struct {
	ResolutionNote string  `json:"resolution_note"`
	BillID         *string `json:"bill_id,omitempty"`
}
