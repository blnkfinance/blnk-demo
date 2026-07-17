package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/blnk"
	custmodel "github.com/blnk-demo/pro-loan-app/backend/internal/customer/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/customer"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/id"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/ledgersetup"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/settings"
	"github.com/blnk-demo/pro-loan-app/backend/internal/wallet"
	"github.com/blnk-demo/pro-loan-app/backend/internal/wallet/model"
)

const currencyPrecision = int64(100)

type walletService struct {
	repo         wallet.Repository
	customerSvc  customer.Service
	customerRepo customer.Repository
	blnkCl       *blnk.Client
	settingsRepo *settings.Repository
}

func New(
	repo wallet.Repository,
	customerSvc customer.Service,
	customerRepo customer.Repository,
	blnkCl *blnk.Client,
	settingsRepo *settings.Repository,
) wallet.Service {
	return &walletService{
		repo:         repo,
		customerSvc:  customerSvc,
		customerRepo: customerRepo,
		blnkCl:       blnkCl,
		settingsRepo: settingsRepo,
	}
}

func (s *walletService) Record(ctx context.Context, input model.RecordInput) (*model.WalletTransaction, error) {
	existing, err := s.repo.GetByReference(ctx, input.Reference)
	if err == nil && existing != nil {
		return existing, nil
	}

	now := time.Now().UTC()
	tx := &model.WalletTransaction{
		ID:           id.New(),
		CustomerID:   input.CustomerID,
		Type:         input.Type,
		AmountCents:  input.AmountCents,
		Currency:     input.Currency,
		Description:  input.Description,
		Reference:    input.Reference,
		BalanceAfter: input.BalanceAfter,
		Counterparty: input.Counterparty,
		BlnkTxID:     input.BlnkTxID,
		CreatedAt:    now,
	}

	if err := s.repo.Create(ctx, tx); err != nil {
		return nil, fmt.Errorf("create wallet transaction: %w", err)
	}

	return tx, nil
}

func (s *walletService) List(ctx context.Context, customerID string, page, pageSize int) ([]*model.WalletTransaction, int64, error) {
	return s.repo.ListByCustomer(ctx, customerID, page, pageSize)
}

func (s *walletService) Get(ctx context.Context, customerID, txID string) (*model.WalletTransaction, error) {
	tx, err := s.repo.GetByID(ctx, txID)
	if err != nil {
		return nil, err
	}
	if tx.CustomerID != customerID {
		return nil, fmt.Errorf("transaction not found")
	}
	return tx, nil
}

func (s *walletService) Transfer(ctx context.Context, senderID string, input model.TransferInput) (*model.TransferResult, error) {
	currency := strings.ToUpper(strings.TrimSpace(input.Currency))
	if currency == "" {
		currency = custmodel.DefaultCurrency
	}

	recipientType := strings.ToLower(strings.TrimSpace(input.RecipientType))
	if recipientType == "" {
		recipientType = "internal"
	}
	if recipientType != "internal" && recipientType != "external" {
		return nil, fmt.Errorf("invalid recipient_type: %s", input.RecipientType)
	}

	senderWalletID, err := s.customerSvc.EnsureWalletBalance(ctx, senderID, currency)
	if err != nil {
		return nil, fmt.Errorf("ensure sender wallet: %w", err)
	}

	sender, err := s.customerRepo.GetByID(ctx, senderID)
	if err != nil {
		return nil, fmt.Errorf("get sender: %w", err)
	}

	plat, err := s.settingsRepo.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("load platform settings: %w", err)
	}

	var feeCfg settings.TransferFeeConfig
	if recipientType == "external" {
		feeCfg = plat.ExternalTransferFeeFor(currency)
	} else {
		feeCfg = plat.TransferFeeFor(currency)
	}
	totalCharges := feeCfg.TotalChargeCents()
	totalDebit := input.AmountCents + totalCharges

	senderBal, err := s.blnkCl.GetBalance(ctx, senderWalletID)
	if err != nil {
		return nil, fmt.Errorf("get sender balance: %w", err)
	}
	if senderBal.BalanceMinorUnits() < totalDebit {
		return nil, fmt.Errorf("insufficient balance: have %d, need %d", senderBal.BalanceMinorUnits(), totalDebit)
	}

	feeIndicator := ledgersetup.FeeIncomeIndicator(currency)
	revenueIndicator := ledgersetup.RevenueIndicator(currency)

	platID := id.New()
	batchID := platID
	transferRef := id.Ref("transfer", platID, "net")

	var destinationID string
	var recipient *custmodel.Customer
	counterparty := "@world"

	if recipientType == "internal" {
		input.RecipientEmail = strings.ToLower(strings.TrimSpace(input.RecipientEmail))
		if input.RecipientEmail == "" {
			return nil, fmt.Errorf("recipient_email is required for internal transfers")
		}
		recipient, err = s.customerRepo.GetByEmail(ctx, input.RecipientEmail)
		if err != nil {
			return nil, fmt.Errorf("recipient not found: %w", err)
		}
		if sender.ID == recipient.ID {
			return nil, fmt.Errorf("cannot transfer to yourself")
		}
		destinationID, err = s.customerSvc.EnsureWalletBalance(ctx, recipient.ID, currency)
		if err != nil {
			return nil, fmt.Errorf("ensure recipient wallet: %w", err)
		}
		counterparty = recipient.Email
	} else {
		destinationID = ledgersetup.WorldIndicator(currency)
	}

	netMeta := map[string]any{
		"app_sender_id":    senderID,
		"type":             "transfer_net",
		"batch_id":         batchID,
		"recipient_type":   recipientType,
		"destination_type": recipientType,
	}
	if recipient != nil {
		netMeta["app_recipient_id"] = recipient.ID
	}
	if recipientType == "external" {
		netMeta["recipient_label"] = "@world"
	}

	netTx, err := s.blnkCl.PostLeg(
		ctx, currencyPrecision, transferRef, currency,
		senderWalletID, destinationID,
		fmt.Sprintf("Transfer %s", counterparty),
		input.AmountCents, false, false, true, netMeta,
	)
	if err != nil {
		return nil, fmt.Errorf("post transfer transaction: %w", err)
	}
	s.linkPlatformIndicators(ctx, destinationID)

	var feeBlnkTxID string
	if feeCfg.FeeLedgerCents > 0 {
		feeRef := id.Ref("transfer", platID, "fee")
		feeTx, err := s.blnkCl.PostLeg(
			ctx, currencyPrecision, feeRef, currency,
			senderWalletID, feeIndicator,
			"Transfer fee",
			feeCfg.FeeLedgerCents, false, false, true,
			map[string]any{"app_sender_id": senderID, "type": "transfer_fee", "batch_id": batchID},
		)
		if err != nil {
			return nil, fmt.Errorf("post fee transaction: %w", err)
		}
		feeBlnkTxID = feeTx.TransactionID
		s.linkPlatformIndicators(ctx, feeIndicator)
	}

	if feeCfg.RevenueLedgerCents > 0 {
		revRef := id.Ref("transfer", platID, "revenue")
		_, err := s.blnkCl.PostLeg(
			ctx, currencyPrecision, revRef, currency,
			senderWalletID, revenueIndicator,
			"Transfer revenue share",
			feeCfg.RevenueLedgerCents, false, false, true,
			map[string]any{"app_sender_id": senderID, "type": "transfer_revenue", "batch_id": batchID},
		)
		if err != nil {
			return nil, fmt.Errorf("post revenue share transaction: %w", err)
		}
		s.linkPlatformIndicators(ctx, revenueIndicator)
	}

	if feeCfg.StampDutyCents > 0 {
		stampIndicator := ledgersetup.StampDutyIndicator(currency)
		stampRef := id.Ref("transfer", platID, "stamp_duty")
		_, err := s.blnkCl.PostLeg(
			ctx, currencyPrecision, stampRef, currency,
			senderWalletID, stampIndicator,
			"Stamp duty",
			feeCfg.StampDutyCents, false, false, true,
			map[string]any{"app_sender_id": senderID, "type": "stamp_duty", "batch_id": batchID},
		)
		if err != nil {
			return nil, fmt.Errorf("post stamp duty transaction: %w", err)
		}
		s.linkPlatformIndicators(ctx, stampIndicator)
	}

	updatedBal, err := s.blnkCl.GetBalance(ctx, senderWalletID)
	if err != nil {
		slog.Warn("failed to fetch updated sender balance", "err", err)
	}

	desc := input.Description
	if desc == "" {
		desc = fmt.Sprintf("Transfer to %s", counterparty)
	}

	senderTx, _ := s.Record(ctx, model.RecordInput{
		CustomerID:   senderID,
		Type:         model.TxTransferSent,
		AmountCents:  input.AmountCents,
		Currency:     currency,
		Description:  desc,
		Reference:    transferRef,
		BalanceAfter: updatedBal.Balance,
		Counterparty: counterparty,
		BlnkTxID:     netTx.TransactionID,
	})

	var recipientTx *model.WalletTransaction
	if recipient != nil {
		recipientTx, _ = s.Record(ctx, model.RecordInput{
			CustomerID:   recipient.ID,
			Type:         model.TxTransferReceived,
			AmountCents:  input.AmountCents,
			Currency:     currency,
			Description:  fmt.Sprintf("Transfer from %s", sender.Email),
			Reference:    id.Ref("transfer", platID, "recv"),
			Counterparty: sender.Email,
			BlnkTxID:     netTx.TransactionID,
		})
	}

	var feeRecord *model.WalletTransaction
	if totalCharges > 0 {
		feeRecord, _ = s.Record(ctx, model.RecordInput{
			CustomerID:   senderID,
			Type:         model.TxFee,
			AmountCents:  totalCharges,
			Currency:     currency,
			Description:  "Transfer fees",
			Reference:    id.Ref("transfer", platID, "fees"),
			BalanceAfter: updatedBal.Balance,
			BlnkTxID:     feeBlnkTxID,
		})
	}

	var bal float64
	if updatedBal != nil {
		bal = updatedBal.Balance
	}

	return &model.TransferResult{
		SenderTx:      senderTx,
		RecipientTx:   recipientTx,
		FeeTx:         feeRecord,
		Fees:          model.TransferFees{TotalChargeCents: totalCharges},
		SenderBalance: bal,
	}, nil
}

func (s *walletService) linkPlatformIndicators(ctx context.Context, refs ...string) {
	plat, err := s.settingsRepo.Get(ctx)
	if err != nil || plat.PlatformIdentityID == "" {
		return
	}
	for _, ref := range refs {
		ledgersetup.TryLinkPlatformIdentity(ctx, s.blnkCl, plat.PlatformIdentityID, ref)
	}
}

func (s *walletService) ResolveRecipient(ctx context.Context, senderID, email string) (*model.ResolvedRecipient, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, fmt.Errorf("recipient_email is required")
	}

	recipient, err := s.customerRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("recipient not found")
	}
	if recipient.ID == senderID {
		return nil, fmt.Errorf("cannot transfer to yourself")
	}

	name := strings.TrimSpace(recipient.FirstName + " " + recipient.LastName)
	if name == "" {
		name = recipient.Email
	}

	return &model.ResolvedRecipient{
		Email:       recipient.Email,
		DisplayName: name,
	}, nil
}

func (s *walletService) TransferFeeConfig(ctx context.Context, currency string, external bool) (model.TransferFees, error) {
	plat, err := s.settingsRepo.Get(ctx)
	if err != nil {
		return model.TransferFees{}, err
	}
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if currency == "" {
		currency = custmodel.DefaultCurrency
	}
	var cfg settings.TransferFeeConfig
	if external {
		cfg = plat.ExternalTransferFeeFor(currency)
	} else {
		cfg = plat.TransferFeeFor(currency)
	}
	return model.TransferFees{TotalChargeCents: cfg.TotalChargeCents()}, nil
}
