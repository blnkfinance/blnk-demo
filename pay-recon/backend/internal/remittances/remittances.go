package remittances

import (
	"context"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/remittances/model"
)

type Repository interface {
	Create(ctx context.Context, r *model.Remittance) error
	List(ctx context.Context) ([]*model.Remittance, error)
	GetByID(ctx context.Context, id string) (*model.Remittance, error)
	ListPaidUnreconciled(ctx context.Context) ([]*model.Remittance, error)
	MarkPaymentSent(ctx context.Context, id string, input model.ConfirmRemittanceInput, confirmedAt, paymentDate time.Time) error
	MarkRemitted(ctx context.Context, id string) error
}

type Service interface {
	Create(ctx context.Context, input model.CreateRemittanceInput) (*model.Remittance, error)
	List(ctx context.Context) ([]*model.Remittance, error)
	Confirm(ctx context.Context, id string, input model.ConfirmRemittanceInput) (*model.Remittance, error)
}
