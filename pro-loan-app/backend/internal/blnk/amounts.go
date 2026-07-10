package blnk

import "math"

// MinorUnits rounds a Blnk numeric amount to the nearest minor-unit integer.
// Blnk balance fields are stored in minor units; transaction amount fields
// use major units — callers should pass the field appropriate to their comparison.
func MinorUnits(v float64) int64 {
	return int64(math.Round(v))
}

// BalanceMinorUnits returns the balance in minor units for cent-level comparisons.
func (b *Balance) BalanceMinorUnits() int64 {
	if b == nil {
		return 0
	}
	return MinorUnits(b.Balance)
}
