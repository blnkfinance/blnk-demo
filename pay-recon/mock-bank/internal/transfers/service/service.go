package service

import (
	"context"
	"errors"
	"strings"

	"github.com/blnk-demo/pay-recon/mock-bank/internal/transfers"
	"github.com/blnk-demo/pay-recon/mock-bank/internal/transfers/model"
	transferrepo "github.com/blnk-demo/pay-recon/mock-bank/internal/transfers/repository"
)

type Service struct {
	repo transfers.Repository
}

func New(repo transfers.Repository) transfers.Service {
	return &Service{repo: repo}
}

func (s *Service) Request(ctx context.Context, input model.RequestTransferInput) (*model.Transfer, error) {
	t := transferrepo.NewTransfer(
		input.FromAccountID,
		input.ToAccountID,
		input.Amount,
		strings.TrimSpace(input.Narration),
	)
	if err := s.repo.Create(ctx, t); err != nil {
		if errors.Is(err, transfers.ErrInsufficientFunds) {
			return nil, err
		}
		return nil, err
	}
	return t, nil
}
