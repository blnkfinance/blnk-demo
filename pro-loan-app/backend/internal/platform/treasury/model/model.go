package model

import (
	"time"

	ledgermodel "github.com/blnk-demo/pro-loan-app/backend/internal/ledger/model"
)

type Status struct {
	Currency               string `json:"currency"`
	FundingPoolIndicator   string `json:"funding_pool_indicator"`
	WorldIndicator         string `json:"world_indicator"`
	FundingPoolBalanceCents int64 `json:"funding_pool_balance_cents"`
	WorldBalanceCents      int64  `json:"world_balance_cents"`
}

type PrefundInput struct {
	Currency    string
	AmountCents int64
	Description string
	Reference   string
}

type PrefundResult struct {
	TransactionID           string `json:"transaction_id"`
	Reference               string `json:"reference"`
	Currency                string `json:"currency"`
	AmountCents             int64  `json:"amount_cents"`
	FundingPoolBalanceCents int64  `json:"funding_pool_balance_cents"`
}

type PrefundRequest struct {
	Currency    string `json:"currency"`
	AmountCents int64  `json:"amount_cents"`
	Description string `json:"description,omitempty"`
	Reference   string `json:"reference"`
}

type StatusResponse struct {
	Status         Status                    `json:"status"`
	RecentPrefunds []ledgermodel.Operation   `json:"recent_prefunds,omitempty"`
}

type PrefundHistoryEntry struct {
	ID                string    `json:"id"`
	Reference         string    `json:"reference"`
	AmountCents       int64     `json:"amount_cents"`
	Currency          string    `json:"currency"`
	BlnkTransactionID string    `json:"blnk_transaction_id,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}
