package loans

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/loans/model"
)

// Repository defines persistence operations for loan applications.
type Repository interface {
	Create(ctx context.Context, app *model.Application) error
	GetByID(ctx context.Context, id string) (*model.Application, error)
	Update(ctx context.Context, app *model.Application) error
	List(ctx context.Context, filter model.ListFilter) ([]*model.Application, int64, error)
	GetScheduleLine(ctx context.Context, loanID, scheduleID string) (*model.ScheduleLine, error)
	UpdateScheduleLine(ctx context.Context, loanID string, line model.ScheduleLine) error
	// MarkDueLines transitions scheduled lines whose due date has passed to
	// "due" status.  Called by the worker on a daily cron.
	MarkDueLines(ctx context.Context) (int64, error)
	// MarkOverdueLines transitions "due" lines that are past their grace
	// period to "overdue" status.  Called by the worker on a daily cron.
	MarkOverdueLines(ctx context.Context) (int64, error)
}

// Service defines business operations for loan applications.
type Service interface {
	Quote(ctx context.Context, input model.QuoteInput) (*model.QuoteResult, error)
	Apply(ctx context.Context, input model.CreateApplicationInput) (*model.Application, error)
	Submit(ctx context.Context, id string) (*model.Application, error)
	GetByID(ctx context.Context, id string) (*model.Application, error)
	List(ctx context.Context, filter model.ListFilter) ([]*model.Application, int64, error)
	Approve(ctx context.Context, id string) (*model.Application, error)
	Reject(ctx context.Context, id, reason string) (*model.Application, error)
	// Disburse records that the loan funds have been sent and activates the
	// loan.  It wires up Blnk identity, loan balance, and disbursement
	// transaction (inflight) as a side effect.
	Disburse(ctx context.Context, id string) (*model.Application, error)
	// CommitDisbursement commits the inflight Blnk disbursement transaction,
	// settling the funds and recording a confirmed disbursal timestamp.
	CommitDisbursement(ctx context.Context, id string) (*model.Application, error)
	// VoidDisbursement voids the inflight Blnk disbursement transaction,
	// releasing the reserved funds back to the funding balance and reverting
	// the loan to approved status so it can be re-disbursed.
	VoidDisbursement(ctx context.Context, id string) (*model.Application, error)
	PayScheduleLine(ctx context.Context, loanID, scheduleID string) (*model.ScheduleLine, error)
	RepayNextDue(ctx context.Context, loanID string) (*model.ScheduleLine, error)
}
