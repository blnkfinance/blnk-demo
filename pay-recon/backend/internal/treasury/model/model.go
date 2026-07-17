package model

type BankCashPosition struct {
	OperatingIndicator string `json:"operating_indicator"`
	BalanceKobo        int64  `json:"balance_kobo"`
	Currency           string `json:"currency"`
	SyncNote           string `json:"sync_note"`
}
