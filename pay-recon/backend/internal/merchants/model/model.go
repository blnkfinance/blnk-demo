package model

import "time"

const StatusActive = "active"
const StatusSuspended = "suspended"

type Merchant struct {
	ID                string    `json:"id"`
	Name              string    `json:"name"`
	TIN               *string   `json:"tin,omitempty"`
	BankAccountNumber string    `json:"bank_account_number"`
	BankName          string    `json:"bank_name"`
	BlnkBalanceID     string    `json:"blnk_balance_id"`
	BlnkIdentityID    *string   `json:"blnk_identity_id,omitempty"`
	Status            string    `json:"status"`
	CreatedAt         time.Time `json:"created_at"`
}

type CreateMerchantInput struct {
	Name              string `json:"name"`
	TIN               string `json:"tin"`
	BankAccountNumber string `json:"bank_account_number"`
	BankName          string `json:"bank_name"`
}

type UpdateMerchantInput struct {
	Name              *string `json:"name,omitempty"`
	TIN               *string `json:"tin,omitempty"`
	BankAccountNumber *string `json:"bank_account_number,omitempty"`
	BankName          *string `json:"bank_name,omitempty"`
	Status            *string `json:"status,omitempty"`
}
