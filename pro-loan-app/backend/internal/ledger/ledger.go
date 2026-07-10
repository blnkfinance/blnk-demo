package ledger

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/ledger/model"
)

// Repository defines persistence operations for local ledger operation records.
type Repository interface {
	Create(ctx context.Context, op *model.Operation) error
	GetByID(ctx context.Context, id string) (*model.Operation, error)
	GetByReference(ctx context.Context, reference string) (*model.Operation, error)
	Update(ctx context.Context, op *model.Operation) error
	ListByLoan(ctx context.Context, loanID string) ([]*model.Operation, error)
}

// Service defines business operations for tracking Blnk ledger postings.
type Service interface {
	Record(ctx context.Context, input model.RecordInput) (*model.Operation, error)
	GetByID(ctx context.Context, id string) (*model.Operation, error)
	GetByReference(ctx context.Context, reference string) (*model.Operation, error)
	MarkPosted(ctx context.Context, id, blnkTransactionID, parentTransaction string) (*model.Operation, error)
	MarkFailed(ctx context.Context, id, errMsg string) (*model.Operation, error)
	ListByLoan(ctx context.Context, loanID string) ([]*model.Operation, error)
}
