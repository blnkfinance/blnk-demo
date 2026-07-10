package model

import "math"

// DisbursementBreakdown captures upfront deductions at loan disbursement.
type DisbursementBreakdown struct {
	RequestedPrincipalCents int64  `bson:"requested_principal_cents" json:"requested_principal_cents"`
	OriginationFeeCents     int64  `bson:"origination_fee_cents" json:"origination_fee_cents"`
	TotalDeductionsCents    int64  `bson:"total_deductions_cents" json:"total_deductions_cents"`
	NetDisbursementCents    int64  `bson:"net_disbursement_cents" json:"net_disbursement_cents"`
	Currency                string `bson:"currency" json:"currency"`
}

// ComputeDisbursementBreakdown calculates net disbursement from gross principal.
func ComputeDisbursementBreakdown(principalCents, originationFeeBps int64, currency string) DisbursementBreakdown {
	originationFee := int64(math.Round(float64(principalCents) * float64(originationFeeBps) / 10000.0))
	if originationFee > principalCents {
		originationFee = principalCents
	}
	return DisbursementBreakdown{
		RequestedPrincipalCents: principalCents,
		OriginationFeeCents:     originationFee,
		TotalDeductionsCents:    originationFee,
		NetDisbursementCents:    principalCents - originationFee,
		Currency:                currency,
	}
}

type QuoteInput struct {
	ProductID      string `json:"product_id"`
	PrincipalCents int64  `json:"principal_cents"`
	TermMonths     int    `json:"term_months"`
}

type QuoteResult struct {
	ProductID           string                `json:"product_id"`
	PrincipalCents      int64                 `json:"principal_cents"`
	TermMonths          int                   `json:"term_months"`
	Currency            string                `json:"currency"`
	AnnualInterestBps   int64                 `json:"annual_interest_bps"`
	OriginationFeeBps   int64                 `json:"origination_fee_bps"`
	Disbursement        DisbursementBreakdown `json:"disbursement"`
	EstimatedEMICents   int64                 `json:"estimated_emi_cents"`
}
