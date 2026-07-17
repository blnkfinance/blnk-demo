package service

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"time"

	"github.com/blnk-demo/pay-recon/mock-bank/internal/statements"
)

type Service struct {
	repo statements.Repository
}

func New(repo statements.Repository) statements.Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, accountID string, from, to time.Time) ([]statements.Line, error) {
	return s.repo.ListDebits(ctx, accountID, from, to)
}

func (s *Service) ExportCSV(ctx context.Context, accountID string, from, to time.Time, w io.Writer) error {
	lines, err := s.repo.ListDebits(ctx, accountID, from, to)
	if err != nil {
		return err
	}
	cw := csv.NewWriter(w)
	if err := cw.Write([]string{"Date", "TransactionID", "Narration", "BeneficiaryAccount", "Debit", "Credit", "Balance"}); err != nil {
		return err
	}
	for _, line := range lines {
		if err := cw.Write([]string{
			line.Date.Format("2006-01-02"),
			line.TransactionID,
			line.Narration,
			line.BeneficiaryAccount,
			fmt.Sprintf("%d", line.Debit),
			fmt.Sprintf("%d", line.Credit),
			fmt.Sprintf("%d", line.Balance),
		}); err != nil {
			return err
		}
	}
	cw.Flush()
	return cw.Error()
}
