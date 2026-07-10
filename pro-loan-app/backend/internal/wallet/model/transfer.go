package model

// TransferInput describes a wallet transfer request.
type TransferInput struct {
	RecipientEmail string `json:"recipient_email"`
	RecipientType  string `json:"recipient_type"` // internal | external
	AmountCents    int64  `json:"amount_cents"`
	Currency       string `json:"currency"`
	Description    string `json:"description"`
}

// TransferFees summarizes customer-visible fees.
type TransferFees struct {
	TotalChargeCents int64 `json:"total_charge_cents"`
}

// TransferResult is returned after a successful transfer.
type TransferResult struct {
	SenderTx        *WalletTransaction `json:"sender_tx"`
	RecipientTx     *WalletTransaction `json:"recipient_tx,omitempty"`
	FeeTx           *WalletTransaction `json:"fee_tx,omitempty"`
	Fees            TransferFees       `json:"fees"`
	SenderBalance   float64            `json:"sender_balance"`
}
