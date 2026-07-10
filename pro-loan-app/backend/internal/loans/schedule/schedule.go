// Package schedule provides loan amortization calculations.
// It uses the standard equal-instalment (annuity) formula so every scheduled
// payment has the same total amount; only the principal/interest split changes
// over time. All monetary values are in the smallest currency unit (cents).
// Origination fees are collected at disbursement, not on the schedule.
package schedule

import (
	"math"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/id"
)

// Line is a single monthly repayment.
type Line struct {
	ID             string
	DueDate        time.Time
	PrincipalCents int64
	InterestCents  int64
	FeeCents       int64
}

// Build computes a monthly equal-instalment schedule.
func Build(
	principalCents int64,
	annualInterestBps int,
	termMonths int,
	startDate time.Time,
) []Line {
	if termMonths <= 0 {
		return nil
	}

	monthlyRate := float64(annualInterestBps) / 10000.0 / 12.0

	var emiCents int64
	if monthlyRate == 0 {
		emiCents = principalCents / int64(termMonths)
	} else {
		r := monthlyRate
		n := float64(termMonths)
		emi := float64(principalCents) * r / (1 - math.Pow(1+r, -n))
		emiCents = int64(math.Round(emi))
	}

	lines := make([]Line, 0, termMonths)
	balance := principalCents

	for i := 0; i < termMonths; i++ {
		dueDate := startDate.AddDate(0, i+1, 0)

		interestCents := int64(math.Round(float64(balance) * monthlyRate))
		principalPart := emiCents - interestCents
		if i == termMonths-1 {
			principalPart = balance
		}
		if principalPart > balance {
			principalPart = balance
		}

		lines = append(lines, Line{
			ID:             id.New(),
			DueDate:        dueDate,
			PrincipalCents: principalPart,
			InterestCents:  interestCents,
			FeeCents:       0,
		})

		balance -= principalPart
		if balance <= 0 {
			break
		}
	}
	return lines
}
