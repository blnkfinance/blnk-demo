package reconciliation

import (
	"context"
	"io"

	"github.com/blnk-demo/pay-recon/backend/internal/reconciliation/model"
)

type Repository interface {
	CreateUpload(ctx context.Context, u *model.StatementUpload) error
	GetUpload(ctx context.Context, id string) (*model.StatementUpload, error)
	CreateRun(ctx context.Context, run *model.Run) error
	UpdateRun(ctx context.Context, run *model.Run) error
	GetRun(ctx context.Context, id string) (*model.Run, error)
	ListRuns(ctx context.Context) ([]*model.Run, error)
	CreateException(ctx context.Context, e *model.Exception) error
	ListExceptions(ctx context.Context, runID string) ([]*model.Exception, error)
	GetException(ctx context.Context, id string) (*model.Exception, error)
	ResolveException(ctx context.Context, id, note string) error
	ListAwaitingPaymentBills(ctx context.Context) ([]string, error)
	FindExistingDedupeKeys(ctx context.Context, keys []string) (map[string]bool, error)
	CreateStatementLines(ctx context.Context, uploadID string, lines []*model.StatementLine) error
	ListUnmatchedLinesByUpload(ctx context.Context, uploadID string) ([]*model.StatementLine, error)
	ListUnsyncedCreditLines(ctx context.Context, uploadID string) ([]*model.StatementLine, error)
	CountSyncedCredits(ctx context.Context, uploadID string) (int, error)
	MarkLineMatched(ctx context.Context, lineID, billID string) error
	MarkLineMatchedRemittance(ctx context.Context, lineID, remittanceID string) error
	MarkLineLedgerSynced(ctx context.Context, lineID string) error
}

type Service interface {
	Upload(ctx context.Context, input model.UploadStatementInput, r io.Reader) (*model.StatementUpload, error)
	GetUpload(ctx context.Context, id string) (*model.StatementUpload, error)
	StartRun(ctx context.Context, uploadID string) (*model.Run, error)
	GetRun(ctx context.Context, id string) (*model.Run, error)
	ListRuns(ctx context.Context) ([]*model.Run, error)
	ListExceptions(ctx context.Context, runID string) ([]*model.Exception, error)
	ResolveException(ctx context.Context, id string, input model.ResolveExceptionInput) error
	ProcessRun(ctx context.Context, runID string) error
}
