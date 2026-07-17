package service

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
	"github.com/google/uuid"
)

func parseStatementCSV(uploadID string, data []byte) ([]*model.StatementLine, error) {
	reader := csv.NewReader(bytes.NewReader(data))
	reader.TrimLeadingSpace = true
	rows, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("parse csv: %w", err)
	}
	if len(rows) < 2 {
		return nil, fmt.Errorf("csv has no data rows")
	}

	header := normalizeHeader(rows[0])
	idx := map[string]int{}
	for i, col := range header {
		idx[col] = i
	}

	dateIdx, ok := headerIndex(idx, "date")
	if !ok {
		return nil, fmt.Errorf("csv missing Date column")
	}
	debitIdx, ok := headerIndex(idx, "debit")
	if !ok {
		return nil, fmt.Errorf("csv missing Debit column")
	}

	txnIdx, hasTxn := headerIndex(idx, "transactionid")
	narrIdx, hasNarr := headerIndex(idx, "narration")
	benIdx, hasBen := headerIndex(idx, "beneficiaryaccount")
	creditIdx, hasCredit := headerIndex(idx, "credit")
	balIdx, hasBal := headerIndex(idx, "balance")

	var lines []*model.StatementLine
	for _, row := range rows[1:] {
		if len(row) == 0 || strings.TrimSpace(strings.Join(row, "")) == "" {
			continue
		}
		lineDate, err := parseCSVDate(row[dateIdx])
		if err != nil {
			continue
		}
		debit := parseCSVAmount(row, debitIdx)
		credit := int64(0)
		if hasCredit && creditIdx < len(row) {
			credit = parseCSVAmount(row, creditIdx)
		}
		balance := int64(0)
		if hasBal && balIdx < len(row) {
			balance = parseCSVAmount(row, balIdx)
		}

		line := &model.StatementLine{
			ID:        uuid.NewString(),
			UploadID:  uploadID,
			Debit:     debit,
			Credit:    credit,
			Balance:   balance,
			LineDate:  lineDate,
			CreatedAt: time.Now().UTC(),
		}
		if hasTxn && txnIdx < len(row) {
			line.TransactionID = strings.TrimSpace(row[txnIdx])
		}
		if hasNarr && narrIdx < len(row) {
			line.Narration = strings.TrimSpace(row[narrIdx])
		}
		if hasBen && benIdx < len(row) {
			line.BeneficiaryAccount = normalizeAccount(row[benIdx])
		}
		if debit == 0 && credit == 0 {
			continue
		}
		lines = append(lines, line)
	}
	return lines, nil
}

func normalizeHeader(cols []string) []string {
	out := make([]string, len(cols))
	for i, col := range cols {
		out[i] = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(col), " ", ""))
	}
	return out
}

func headerIndex(idx map[string]int, key string) (int, bool) {
	i, ok := idx[key]
	return i, ok
}

func parseCSVDate(raw string) (time.Time, error) {
	raw = strings.TrimSpace(raw)
	// Prefer ISO then day/month (NG) — avoid ambiguous US month/day.
	for _, layout := range []string{"2006-01-02", "02/01/2006", "2/1/2006"} {
		if t, err := time.Parse(layout, raw); err == nil {
			return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid date: %s", raw)
}

func parseCSVAmount(row []string, idx int) int64 {
	if idx >= len(row) {
		return 0
	}
	raw := strings.TrimSpace(row[idx])
	if raw == "" {
		return 0
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err == nil {
		return value
	}
	f, err := strconv.ParseFloat(strings.ReplaceAll(raw, ",", ""), 64)
	if err != nil {
		return 0
	}
	// Naira major units with decimals → kobo.
	return int64(math.Round(f * 100))
}

func normalizeAccount(account string) string {
	return strings.TrimSpace(strings.ReplaceAll(account, " ", ""))
}
