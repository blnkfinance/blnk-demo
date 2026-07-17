package service

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strconv"
	"strings"

	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
)

// buildBlnkExternalCSV converts Horizon/PayRecon statement lines into Blnk's
// required external reconciliation CSV:
// id,amount,reference,currency,description,date,source
func buildBlnkExternalCSV(source, currency string, lines []*model.StatementLine) ([]byte, error) {
	source = strings.TrimSpace(source)
	if source == "" {
		source = "mock-bank"
	}
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if currency == "" {
		currency = "NGN"
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	if err := w.Write([]string{"id", "amount", "reference", "currency", "description", "date", "source"}); err != nil {
		return nil, err
	}
	for _, line := range lines {
		id := strings.TrimSpace(line.TransactionID)
		if id == "" {
			id = line.ID
		}
		amountKobo := line.Debit
		if amountKobo == 0 {
			amountKobo = line.Credit
		}
		amountMajor := float64(amountKobo) / 100.0
		desc := strings.TrimSpace(line.Narration)
		if desc == "" {
			desc = "Bank statement line"
		}
		if err := w.Write([]string{
			id,
			strconv.FormatFloat(amountMajor, 'f', 2, 64),
			id,
			currency,
			desc,
			line.LineDate.UTC().Format("2006-01-02T15:04:05Z"),
			source,
		}); err != nil {
			return nil, err
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("build blnk csv: %w", err)
	}
	return buf.Bytes(), nil
}
