package model

import (
	"time"

	"github.com/shopspring/decimal"
)

type Category struct {
	ID            string          `json:"id"`
	Code          string          `json:"code"`
	Label         string          `json:"label"`
	Rate          decimal.Decimal `json:"rate"`
	Active        bool            `json:"active"`
	EffectiveFrom time.Time       `json:"effective_from"`
}

type CreateCategoryInput struct {
	Code          string  `json:"code"`
	Label         string  `json:"label"`
	Rate          float64 `json:"rate"`
	EffectiveFrom string  `json:"effective_from,omitempty"`
}
