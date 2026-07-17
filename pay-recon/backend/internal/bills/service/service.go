package service

import (
	"context"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/bills"
	"github.com/blnk-demo/pay-recon/backend/internal/bills/model"
	"github.com/blnk-demo/pay-recon/backend/internal/blnk"
	"github.com/blnk-demo/pay-recon/backend/internal/config"
	"github.com/blnk-demo/pay-recon/backend/internal/merchants"
	merchantmodel "github.com/blnk-demo/pay-recon/backend/internal/merchants/model"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnkaccounts"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnksetup"
	"github.com/blnk-demo/pay-recon/backend/internal/whtcategories"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

var billRefPattern = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)

type Service struct {
	repo         bills.Repository
	merchantRepo merchants.Repository
	whtRepo      whtcategories.Repository
	accountsRepo *blnkaccounts.Repository
	blnkCl       *blnk.Client
	cfg          config.Config
}

func New(
	repo bills.Repository,
	merchantRepo merchants.Repository,
	whtRepo whtcategories.Repository,
	accountsRepo *blnkaccounts.Repository,
	blnkCl *blnk.Client,
	cfg config.Config,
) bills.Service {
	return &Service{
		repo:         repo,
		merchantRepo: merchantRepo,
		whtRepo:      whtRepo,
		accountsRepo: accountsRepo,
		blnkCl:       blnkCl,
		cfg:          cfg,
	}
}

func (s *Service) Create(ctx context.Context, input model.CreateBillInput, createdBy string) (*model.Bill, error) {
	ref := strings.TrimSpace(input.BillReference)
	if ref == "" {
		generated, err := s.generateBillReference(ctx)
		if err != nil {
			return nil, fmt.Errorf("generate bill_reference: %w", err)
		}
		ref = generated
	} else if len(ref) > model.MaxBillReferenceLen || !billRefPattern.MatchString(ref) {
		return nil, fmt.Errorf("invalid bill_reference")
	}
	if input.GrossAmount <= 0 {
		return nil, fmt.Errorf("gross_amount must be positive")
	}

	merchant, err := s.merchantRepo.GetByID(ctx, input.MerchantID)
	if err != nil {
		return nil, fmt.Errorf("merchant not found")
	}
	if merchant.Status != merchantmodel.StatusActive {
		return nil, fmt.Errorf("merchant is not active")
	}
	if merchant.TIN == nil || strings.TrimSpace(*merchant.TIN) == "" {
		return nil, fmt.Errorf("merchant tin is required")
	}

	category, err := s.whtRepo.GetByID(ctx, input.WHTCategoryID)
	if err != nil {
		return nil, fmt.Errorf("wht category not found")
	}

	whtAmount := roundKobo(decimal.NewFromInt(input.GrossAmount).Mul(category.Rate))
	netAmount := input.GrossAmount - whtAmount
	if netAmount <= 0 {
		return nil, fmt.Errorf("net amount must be positive")
	}

	purchaseExpense, err := blnksetup.PurchaseExpenseIndicator(ctx, s.accountsRepo)
	if err != nil {
		return nil, err
	}
	accountsPayable, err := blnksetup.AccountsPayableIndicator(ctx, s.accountsRepo)
	if err != nil {
		return nil, err
	}

	billID := uuid.NewString()
	obligationRef := "bill_obligation_" + ref

	obligationMeta := map[string]any{
		"bill_id":        billID,
		"bill_reference": ref,
		"merchant_id":    merchant.ID,
		"gross_amount":   input.GrossAmount,
		"wht_amount":     whtAmount,
		"net_amount":     netAmount,
		"purpose":        strings.TrimSpace(input.Purpose),
		"type":           "bill_obligation",
	}
	if vendorInvoice := strings.TrimSpace(input.VendorInvoiceRef); vendorInvoice != "" {
		obligationMeta["vendor_invoice_ref"] = vendorInvoice
	}

	// PurchaseExpense starts at 0; allow_overdraft so the first obligation can post.
	obligationTxn, err := s.blnkCl.PostLeg(ctx, obligationRef, s.cfg.DefaultCurrency, purchaseExpense, accountsPayable,
		strings.TrimSpace(input.Purpose), input.GrossAmount, false, true, true, obligationMeta)
	if err != nil && !blnk.IsDuplicateReferenceError(err) {
		return nil, fmt.Errorf("blnk obligation leg: %w", err)
	}
	if obligationTxn == nil {
		obligationTxn = &blnk.Transaction{TransactionID: obligationRef}
	}

	var attachment *string
	if strings.TrimSpace(input.AttachmentURL) != "" {
		a := strings.TrimSpace(input.AttachmentURL)
		attachment = &a
	}
	var vendorInvoice *string
	if v := strings.TrimSpace(input.VendorInvoiceRef); v != "" {
		vendorInvoice = &v
	}

	bill := &model.Bill{
		ID:               billID,
		BillReference:    ref,
		VendorInvoiceRef: vendorInvoice,
		MerchantID:       merchant.ID,
		WHTCategoryID:    category.ID,
		Purpose:          strings.TrimSpace(input.Purpose),
		GrossAmount:      input.GrossAmount,
		WHTRate:          category.Rate.StringFixed(4),
		WHTAmount:        whtAmount,
		NetAmount:        netAmount,
		Currency:         s.cfg.DefaultCurrency,
		AttachmentURL:    attachment,
		Status:           model.StatusAwaitingPayment,
		BlnkNetTxnID:     obligationTxn.TransactionID,
		BlnkWHTTxnID:     obligationTxn.TransactionID,
		CreatedBy:        createdBy,
		CreatedAt:        time.Now().UTC(),
	}

	if err := s.repo.Create(ctx, bill); err != nil {
		return nil, fmt.Errorf("persist bill after ledger obligation: %w (ledger may already hold bill_obligation_%s)", err, ref)
	}

	return bill, nil
}

func (s *Service) GetByID(ctx context.Context, id string) (*model.Bill, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, filter model.ListFilter) ([]*model.Bill, error) {
	return s.repo.List(ctx, filter)
}

func (s *Service) PaymentInstruction(ctx context.Context, id string) (*model.PaymentInstruction, error) {
	bill, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	merchant, err := s.merchantRepo.GetByID(ctx, bill.MerchantID)
	if err != nil {
		return nil, err
	}
	return &model.PaymentInstruction{
		AccountNumber: merchant.BankAccountNumber,
		BankName:      merchant.BankName,
		Amount:        bill.NetAmount,
		Narration:     bill.BillReference,
		Currency:      bill.Currency,
	}, nil
}

func (s *Service) ConfirmPayment(ctx context.Context, id string, input model.ConfirmPaymentInput, confirmedBy string) (*model.Bill, error) {
	bill, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if bill.Status != model.StatusAwaitingPayment {
		return nil, fmt.Errorf("bill is not awaiting payment")
	}
	if strings.TrimSpace(input.BankPaymentReference) == "" {
		return nil, fmt.Errorf("bank_payment_reference is required")
	}
	// Bank txn ID is trusted attestation only — PayRecon does not call the bank.
	// Proof happens later when the statement CSV is reconciled.
	paymentDate := time.Now().UTC()
	if strings.TrimSpace(input.BankPaymentDate) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(input.BankPaymentDate))
		if err != nil {
			return nil, fmt.Errorf("invalid bank_payment_date")
		}
		paymentDate = parsed
	}

	merchant, err := s.merchantRepo.GetByID(ctx, bill.MerchantID)
	if err != nil {
		return nil, err
	}

	accountsPayable, err := blnksetup.AccountsPayableIndicator(ctx, s.accountsRepo)
	if err != nil {
		return nil, err
	}
	operating, err := blnksetup.OperatingIndicator(ctx, s.accountsRepo)
	if err != nil {
		return nil, err
	}
	taxPayable, err := blnksetup.TaxPayableIndicator(ctx, s.accountsRepo)
	if err != nil {
		return nil, err
	}
	liabilityClearing, err := blnksetup.LiabilityClearingIndicator(ctx, s.accountsRepo)
	if err != nil {
		return nil, err
	}

	refBase := "bill_payment_" + bill.BillReference
	paymentMeta := map[string]any{
		"bill_id":                bill.ID,
		"bill_reference":         bill.BillReference,
		"bank_payment_reference": strings.TrimSpace(input.BankPaymentReference),
		"type":                   "bill_payment",
	}

	// WHT: reclass liability AP → tax payable (no cash).
	if bill.WHTAmount > 0 {
		whtTxn, err := s.blnkCl.PostLeg(ctx, refBase+"_wht", bill.Currency, accountsPayable, taxPayable,
			"WHT reclass for "+bill.BillReference, bill.WHTAmount, false, true, false, paymentMeta)
		if err != nil && !blnk.IsDuplicateReferenceError(err) {
			return nil, fmt.Errorf("blnk wht reclass: %w", err)
		}
		if whtTxn != nil {
			bill.BlnkWHTTxnID = whtTxn.TransactionID
		}
	}

	// Clear remaining AP into settlement sink (not the merchant — cash leg credits merchant once).
	if _, err := s.blnkCl.PostLeg(ctx, refBase+"_ap_clear", bill.Currency, accountsPayable, liabilityClearing,
		"AP clearance for "+bill.BillReference, bill.NetAmount, false, true, false, paymentMeta); err != nil && !blnk.IsDuplicateReferenceError(err) {
		return nil, fmt.Errorf("blnk ap clearance: %w", err)
	}

	// Cash payout: Operating → merchant (net once).
	netTxn, err := s.blnkCl.PostLeg(ctx, refBase+"_cash", bill.Currency, operating, merchant.BlnkBalanceID,
		"Vendor payment for "+bill.BillReference, bill.NetAmount, false, true, true, paymentMeta)
	if err != nil && !blnk.IsDuplicateReferenceError(err) {
		return nil, fmt.Errorf("blnk cash payment: %w", err)
	}
	if netTxn != nil {
		bill.BlnkNetTxnID = netTxn.TransactionID
	}

	if err := s.repo.MarkPaymentSent(ctx, bill.ID, input, confirmedBy, time.Now().UTC(), paymentDate); err != nil {
		return nil, fmt.Errorf("ledger payment posted but persist failed — retry confirm: %w", err)
	}
	return s.repo.GetByID(ctx, bill.ID)
}

func roundKobo(d decimal.Decimal) int64 {
	f, _ := d.Float64()
	return int64(math.Round(f))
}
