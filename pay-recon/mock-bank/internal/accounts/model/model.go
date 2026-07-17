package model

import "time"

type Account struct {
	ID            string    `json:"id"`
	AccountNumber string    `json:"account_number"`
	AccountName   string    `json:"account_name"`
	Balance       int64     `json:"balance"`
	AccountType   string    `json:"account_type"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreateAccountInput struct {
	AccountNumber string `json:"account_number"`
	AccountName   string `json:"account_name"`
	Balance       int64  `json:"balance"`
	AccountType   string `json:"account_type"`
}

type FundAccountInput struct {
	Amount    int64  `json:"amount"`
	Reference string `json:"reference,omitempty"`
}
