package treasury

import (
	"context"

	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/treasury/model"
)

// PlatformLoanID is the sentinel loan_id used for platform-level ledger operations.
const PlatformLoanID = "platform"

// Service manages treasury prefunding and funding pool visibility.
type Service interface {
	GetStatus(ctx context.Context, currency string) (*model.Status, error)
	PrefundFundingPool(ctx context.Context, input model.PrefundInput) (*model.PrefundResult, error)
	FundingPoolBalanceCents(ctx context.Context, currency string) (int64, error)
}
