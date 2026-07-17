package model

import "time"

type Record struct {
	ID          string    `json:"id"`
	BillID      string    `json:"bill_id"`
	MerchantID  string    `json:"merchant_id"`
	AmountCents int64     `json:"amount_cents"`
	RateBPS     int       `json:"rate_bps"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}
