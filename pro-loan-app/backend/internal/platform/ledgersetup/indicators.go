package ledgersetup

import "strings"

// Platform internal balances are referenced by @ indicators in Blnk transactions.
// Blnk auto-creates them in the General Ledger on first use. One indicator per
// currency is shared across all customers and loans.
func platformIndicator(name, currency string) string {
	return "@" + name + strings.ToUpper(strings.TrimSpace(currency))
}

func FundingPoolIndicator(currency string) string {
	return platformIndicator("FundingPool", currency)
}

func FeeIncomeIndicator(currency string) string {
	return platformIndicator("FeeIncome", currency)
}

func RevenueIndicator(currency string) string {
	return platformIndicator("Revenue", currency)
}

func StampDutyIndicator(currency string) string {
	return platformIndicator("StampDuty", currency)
}

func InterestIncomeIndicator(currency string) string {
	return platformIndicator("InterestIncome", currency)
}

func WorldIndicator(currency string) string {
	return platformIndicator("World", currency)
}

func LoanOriginationContraIndicator(currency string) string {
	return platformIndicator("LoanOriginationContra", currency)
}

func LoanSettlementIndicator(currency string) string {
	return platformIndicator("LoanSettlement", currency)
}

// IndicatorCurrency extracts the ISO currency suffix from a platform indicator
// such as @FundingPoolNGN → NGN.
func IndicatorCurrency(indicator string) string {
	indicator = strings.TrimSpace(indicator)
	if len(indicator) < 4 || indicator[0] != '@' {
		return ""
	}
	return strings.ToUpper(indicator[len(indicator)-3:])
}
