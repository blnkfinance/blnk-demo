package model

import "time"

type Transfer struct {
	ID                 string    `json:"id"`
	BankTransactionID  string    `json:"bank_transaction_id"`
	FromAccountID      string    `json:"from_account_id"`
	ToAccountID        string    `json:"to_account_id"`
	Amount             int64     `json:"amount"`
	Narration          string    `json:"narration"`
	TransactionDate    time.Time `json:"transaction_date"`
	Status             string    `json:"status"`
}

type RequestTransferInput struct {
	FromAccountID string `json:"from_account_id"`
	ToAccountID   string `json:"to_account_id"`
	Amount        int64  `json:"amount"`
	Narration     string `json:"narration"`
}
