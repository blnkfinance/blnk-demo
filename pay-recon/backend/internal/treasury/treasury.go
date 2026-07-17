package treasury

import (
	"context"

	"github.com/blnk-demo/pay-recon/backend/internal/treasury/model"
)

type Service interface {
	GetBankCashPosition(ctx context.Context) (*model.BankCashPosition, error)
}
