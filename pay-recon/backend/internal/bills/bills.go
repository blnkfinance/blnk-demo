package bills

import (
	"context"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/bills/model"
)

type Repository interface {
	Create(ctx context.Context, b *model.Bill) error
	GetByID(ctx context.Context, id string) (*model.Bill, error)
	GetByReference(ctx context.Context, ref string) (*model.Bill, error)
	GetByNetTxnID(ctx context.Context, txnID string) (*model.Bill, error)
	List(ctx context.Context, filter model.ListFilter) ([]*model.Bill, error)
	MarkPaid(ctx context.Context, id string) error
	MarkPaymentSent(ctx context.Context, id string, input model.ConfirmPaymentInput, confirmedBy string, confirmedAt time.Time, paymentDate time.Time) error
	UpdateStatus(ctx context.Context, id, status string) error
	NextReferenceSeq(ctx context.Context, day time.Time) (int, error)
}

type Service interface {
	Create(ctx context.Context, input model.CreateBillInput, createdBy string) (*model.Bill, error)
	GetByID(ctx context.Context, id string) (*model.Bill, error)
	List(ctx context.Context, filter model.ListFilter) ([]*model.Bill, error)
	PaymentInstruction(ctx context.Context, id string) (*model.PaymentInstruction, error)
	ConfirmPayment(ctx context.Context, id string, input model.ConfirmPaymentInput, confirmedBy string) (*model.Bill, error)
}
