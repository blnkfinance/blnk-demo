package model

import "time"

type RepaymentFrequency string

const (
	FrequencyMonthly  RepaymentFrequency = "monthly"
	FrequencyWeekly   RepaymentFrequency = "weekly"
	FrequencyBiWeekly RepaymentFrequency = "bi_weekly"
	FrequencyBullet   RepaymentFrequency = "bullet"
)

type Product struct {
	ID                 string             `bson:"_id" json:"id"`
	Name               string             `bson:"name" json:"name"`
	Currency           string             `bson:"currency" json:"currency"`
	PrincipalMinCents  int64              `bson:"principal_min_cents" json:"principal_min_cents"`
	PrincipalMaxCents  int64              `bson:"principal_max_cents" json:"principal_max_cents"`
	AnnualInterestBps  int64              `bson:"annual_interest_bps" json:"annual_interest_bps"`
	TermMonths         int                `bson:"term_months" json:"term_months"`
	OriginationFeeBps  int64              `bson:"origination_fee_bps" json:"origination_fee_bps"`
	RepaymentFrequency RepaymentFrequency `bson:"repayment_frequency" json:"repayment_frequency"`
	Archived           bool               `bson:"archived" json:"archived"`
	CreatedAt          time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt          time.Time          `bson:"updated_at" json:"updated_at"`
	ArchivedAt         *time.Time         `bson:"archived_at,omitempty" json:"archived_at,omitempty"`
}

type CreateProductInput struct {
	Name               string             `json:"name"`
	Currency           string             `json:"currency"`
	PrincipalMinCents  int64              `json:"principal_min_cents"`
	PrincipalMaxCents  int64              `json:"principal_max_cents"`
	AnnualInterestBps  int64              `json:"annual_interest_bps"`
	TermMonths         int                `json:"term_months"`
	OriginationFeeBps  int64              `json:"origination_fee_bps"`
	RepaymentFrequency RepaymentFrequency `json:"repayment_frequency"`
}

type UpdateProductInput struct {
	Name               *string             `json:"name,omitempty"`
	AnnualInterestBps  *int64              `json:"annual_interest_bps,omitempty"`
	OriginationFeeBps  *int64              `json:"origination_fee_bps,omitempty"`
	PrincipalMinCents  *int64              `json:"principal_min_cents,omitempty"`
	PrincipalMaxCents  *int64              `json:"principal_max_cents,omitempty"`
	RepaymentFrequency *RepaymentFrequency `json:"repayment_frequency,omitempty"`
}
