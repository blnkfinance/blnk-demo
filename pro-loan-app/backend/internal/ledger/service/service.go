package service

import (
	"context"
	"fmt"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/ledger"
	"github.com/blnk-demo/pro-loan-app/backend/internal/ledger/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/id"
)

type ledgerService struct {
	repo ledger.Repository
}

func New(repo ledger.Repository) ledger.Service {
	return &ledgerService{repo: repo}
}

func (s *ledgerService) Record(ctx context.Context, input model.RecordInput) (*model.Operation, error) {
	existing, err := s.repo.GetByReference(ctx, input.Reference)
	if err == nil && existing != nil {
		return existing, nil
	}

	now := time.Now().UTC()
	op := &model.Operation{
		ID:          newID(),
		LoanID:      input.LoanID,
		Kind:        input.Kind,
		Reference:   input.Reference,
		Status:      model.OperationPending,
		AmountCents: input.AmountCents,
		Currency:    input.Currency,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.Create(ctx, op); err != nil {
		return nil, fmt.Errorf("record operation: %w", err)
	}

	return op, nil
}

func (s *ledgerService) GetByID(ctx context.Context, id string) (*model.Operation, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ledgerService) GetByReference(ctx context.Context, reference string) (*model.Operation, error) {
	return s.repo.GetByReference(ctx, reference)
}

func (s *ledgerService) MarkPosted(ctx context.Context, id, blnkTransactionID, parentTransaction string) (*model.Operation, error) {
	op, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	op.Status = model.OperationPosted
	op.BlnkTransactionID = blnkTransactionID
	op.ParentTransaction = parentTransaction
	op.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, op); err != nil {
		return nil, fmt.Errorf("mark posted: %w", err)
	}

	return op, nil
}

func (s *ledgerService) MarkFailed(ctx context.Context, id, errMsg string) (*model.Operation, error) {
	op, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	op.Status = model.OperationFailed
	op.LastError = errMsg
	op.RetryCount++
	op.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, op); err != nil {
		return nil, fmt.Errorf("mark failed: %w", err)
	}

	return op, nil
}

func (s *ledgerService) ListByLoan(ctx context.Context, loanID string) ([]*model.Operation, error) {
	return s.repo.ListByLoan(ctx, loanID)
}

func newID() string {
	return id.New()
}
