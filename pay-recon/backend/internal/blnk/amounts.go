package blnk

import "math"

const DefaultPrecision int64 = 100

// MinorUnits rounds a Blnk numeric amount to the nearest minor-unit integer.
func MinorUnits(v float64) int64 {
	return int64(math.Round(v))
}
