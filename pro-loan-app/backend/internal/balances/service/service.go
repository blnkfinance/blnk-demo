package service

import (
	"context"
	"fmt"

	"github.com/blnk-demo/pro-loan-app/backend/internal/balances"
	"github.com/blnk-demo/pro-loan-app/backend/internal/balances/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/blnk"
)

type balanceService struct {
	blnkCl *blnk.Client
}

func New(blnkCl *blnk.Client) balances.Service {
	return &balanceService{blnkCl: blnkCl}
}

func (s *balanceService) GetByID(ctx context.Context, balanceID string) (*model.Balance, error) {
	var b model.Balance
	if err := s.blnkCl.Get(ctx, fmt.Sprintf("/balances/%s", balanceID), &b); err != nil {
		return nil, fmt.Errorf("get balance %s: %w", balanceID, err)
	}

	return &b, nil
}

func (s *balanceService) ListByLoan(ctx context.Context, loanID string) ([]*model.Balance, error) {
	// Balances linked to a loan are retrieved from Blnk using the loan's metadata filter.
	// This will be wired to the Blnk filter API once ledger integration is implemented.
	return nil, fmt.Errorf("list balances by loan not yet implemented for loan %s", loanID)
}
