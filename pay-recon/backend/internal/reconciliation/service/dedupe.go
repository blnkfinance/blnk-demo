package service

import (
	"strconv"
	"strings"

	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
)

func normalizeCadence(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case model.CadenceWeekly:
		return model.CadenceWeekly
	case model.CadenceMonthly:
		return model.CadenceMonthly
	default:
		return model.CadenceDaily
	}
}

func statementDedupeKey(source string, line *model.StatementLine) string {
	source = strings.ToLower(strings.TrimSpace(source))
	if txn := strings.TrimSpace(line.TransactionID); txn != "" {
		return source + "|txn|" + strings.ToUpper(txn)
	}
	return source + "|fp|" +
		line.LineDate.Format("2006-01-02") + "|" +
		strconv.FormatInt(line.Debit, 10) + "|" +
		strconv.FormatInt(line.Credit, 10) + "|" +
		normalizeAccount(line.BeneficiaryAccount) + "|" +
		strings.TrimSpace(line.Narration)
}

func filterNewStatementLines(source string, lines []*model.StatementLine, existing map[string]bool) ([]*model.StatementLine, int) {
	seenInFile := make(map[string]bool, len(lines))
	newLines := make([]*model.StatementLine, 0, len(lines))
	skipped := 0

	for _, line := range lines {
		key := statementDedupeKey(source, line)
		line.DedupeKey = key
		if seenInFile[key] || existing[key] {
			skipped++
			continue
		}
		seenInFile[key] = true
		newLines = append(newLines, line)
	}

	return newLines, skipped
}
