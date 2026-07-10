// Package settings persists shared platform configuration values in MongoDB.
// The primary use-case is storing the Blnk ledger IDs that are created once
// on first boot so subsequent restarts reuse the same ledgers.
package settings

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const docID = "platform"

// TransferFeeConfig defines customer-visible transfer fees and the internal
// split across platform revenue balances.
type TransferFeeConfig struct {
	TotalFeeCents      int64 `bson:"total_fee_cents" json:"total_fee_cents"`
	FeeLedgerCents     int64 `bson:"fee_ledger_cents" json:"fee_ledger_cents"`
	RevenueLedgerCents int64 `bson:"revenue_ledger_cents" json:"revenue_ledger_cents"`
	StampDutyCents     int64 `bson:"stamp_duty_cents" json:"stamp_duty_cents"`
}

// TotalChargeCents returns the full fee amount shown to the customer.
func (c TransferFeeConfig) TotalChargeCents() int64 {
	return c.TotalFeeCents + c.StampDutyCents
}

// PlatformSettings holds IDs that are created once and shared by all requests.
type PlatformSettings struct {
	ID                      string                       `bson:"_id"`
	PlatformIdentityID      string                       `bson:"platform_identity_id,omitempty"`
	FundingLedgerID         string                       `bson:"funding_ledger_id"`
	ReceivableLedgerID      string                       `bson:"receivable_ledger_id"`
	InterestLedgerID        string                       `bson:"interest_ledger_id"`
	FeeLedgerID             string                       `bson:"fee_ledger_id"`
	StampDutyLedgerID       string                       `bson:"stamp_duty_ledger_id"`
	RevenueLedgerID         string                       `bson:"revenue_ledger_id"`
	OutboundClearingLedgerID string                      `bson:"outbound_clearing_ledger_id"`
	SuspenseLedgerID        string                       `bson:"suspense_ledger_id,omitempty"` // legacy
	WalletLedgerID          string                       `bson:"wallet_ledger_id"`
	FundingBalanceIDs       map[string]string            `bson:"funding_balance_ids,omitempty"`
	FundingBalanceID        string                       `bson:"funding_balance_id,omitempty"` // legacy single USD balance
	FeeBalanceIDs           map[string]string            `bson:"fee_balance_ids,omitempty"`
	StampDutyBalanceIDs     map[string]string            `bson:"stamp_duty_balance_ids,omitempty"`
	RevenueBalanceIDs       map[string]string            `bson:"revenue_balance_ids,omitempty"`
	InterestBalanceIDs      map[string]string            `bson:"interest_balance_ids,omitempty"`
	OutboundClearingBalanceIDs map[string]string         `bson:"outbound_clearing_balance_ids,omitempty"`
	LoanOriginationContraBalanceIDs map[string]string    `bson:"loan_origination_contra_balance_ids,omitempty"`
	LoanSettlementBalanceIDs map[string]string         `bson:"loan_settlement_balance_ids,omitempty"`
	TransferFeeConfigs      map[string]TransferFeeConfig `bson:"transfer_fee_configs,omitempty"`
	UpdatedAt               time.Time                    `bson:"updated_at"`
}

// Normalize migrates legacy fields and ensures maps are initialized.
func (s *PlatformSettings) Normalize() {
	if s.FundingBalanceIDs == nil {
		s.FundingBalanceIDs = make(map[string]string)
	}
	if s.FundingBalanceID != "" {
		if _, ok := s.FundingBalanceIDs["USD"]; !ok {
			s.FundingBalanceIDs["USD"] = s.FundingBalanceID
		}
	}
	if s.FeeBalanceIDs == nil {
		s.FeeBalanceIDs = make(map[string]string)
	}
	if s.StampDutyBalanceIDs == nil {
		s.StampDutyBalanceIDs = make(map[string]string)
	}
	if s.RevenueBalanceIDs == nil {
		s.RevenueBalanceIDs = make(map[string]string)
	}
	if s.InterestBalanceIDs == nil {
		s.InterestBalanceIDs = make(map[string]string)
	}
	if s.OutboundClearingBalanceIDs == nil {
		s.OutboundClearingBalanceIDs = make(map[string]string)
	}
	if s.LoanOriginationContraBalanceIDs == nil {
		s.LoanOriginationContraBalanceIDs = make(map[string]string)
	}
	if s.LoanSettlementBalanceIDs == nil {
		s.LoanSettlementBalanceIDs = make(map[string]string)
	}
	if s.TransferFeeConfigs == nil {
		s.TransferFeeConfigs = defaultTransferFeeConfigs()
	}
	if s.OutboundClearingLedgerID == "" && s.SuspenseLedgerID != "" {
		s.OutboundClearingLedgerID = s.SuspenseLedgerID
	}
}

func defaultTransferFeeConfigs() map[string]TransferFeeConfig {
	return map[string]TransferFeeConfig{
		"NGN": {
			TotalFeeCents:      5000, // ₦50 shown as generic fee
			FeeLedgerCents:     2000, // ₦20
			RevenueLedgerCents: 3000, // ₦30
			StampDutyCents:     0,
		},
		"USD": {
			TotalFeeCents:      100,
			FeeLedgerCents:     40,
			RevenueLedgerCents: 60,
			StampDutyCents:     0,
		},
	}
}

func normalizeCurrency(currency string) string {
	return strings.ToUpper(strings.TrimSpace(currency))
}

func (s *PlatformSettings) balanceFromMap(m map[string]string, currency string) string {
	if m == nil {
		return ""
	}
	return m[normalizeCurrency(currency)]
}

func (s *PlatformSettings) setBalance(m *map[string]string, currency, balanceID string) {
	if *m == nil {
		*m = make(map[string]string)
	}
	(*m)[normalizeCurrency(currency)] = balanceID
}

// FundingBalanceFor returns the platform funding balance ID for a currency.
func (s *PlatformSettings) FundingBalanceFor(currency string) string {
	s.Normalize()
	return s.FundingBalanceIDs[normalizeCurrency(currency)]
}

// SetFundingBalance records a platform funding balance for a currency.
func (s *PlatformSettings) SetFundingBalance(currency, balanceID string) {
	s.Normalize()
	s.setBalance(&s.FundingBalanceIDs, currency, balanceID)
}

func (s *PlatformSettings) FeeBalanceFor(currency string) string {
	s.Normalize()
	return s.balanceFromMap(s.FeeBalanceIDs, currency)
}

func (s *PlatformSettings) SetFeeBalance(currency, balanceID string) {
	s.Normalize()
	s.setBalance(&s.FeeBalanceIDs, currency, balanceID)
}

func (s *PlatformSettings) StampDutyBalanceFor(currency string) string {
	s.Normalize()
	return s.balanceFromMap(s.StampDutyBalanceIDs, currency)
}

func (s *PlatformSettings) SetStampDutyBalance(currency, balanceID string) {
	s.Normalize()
	s.setBalance(&s.StampDutyBalanceIDs, currency, balanceID)
}

func (s *PlatformSettings) RevenueBalanceFor(currency string) string {
	s.Normalize()
	return s.balanceFromMap(s.RevenueBalanceIDs, currency)
}

func (s *PlatformSettings) SetRevenueBalance(currency, balanceID string) {
	s.Normalize()
	s.setBalance(&s.RevenueBalanceIDs, currency, balanceID)
}

func (s *PlatformSettings) InterestBalanceFor(currency string) string {
	s.Normalize()
	return s.balanceFromMap(s.InterestBalanceIDs, currency)
}

func (s *PlatformSettings) SetInterestBalance(currency, balanceID string) {
	s.Normalize()
	s.setBalance(&s.InterestBalanceIDs, currency, balanceID)
}

func (s *PlatformSettings) OutboundClearingBalanceFor(currency string) string {
	s.Normalize()
	return s.balanceFromMap(s.OutboundClearingBalanceIDs, currency)
}

func (s *PlatformSettings) SetOutboundClearingBalance(currency, balanceID string) {
	s.Normalize()
	s.setBalance(&s.OutboundClearingBalanceIDs, currency, balanceID)
}

func (s *PlatformSettings) LoanOriginationContraBalanceFor(currency string) string {
	s.Normalize()
	return s.balanceFromMap(s.LoanOriginationContraBalanceIDs, currency)
}

func (s *PlatformSettings) SetLoanOriginationContraBalance(currency, balanceID string) {
	s.Normalize()
	s.setBalance(&s.LoanOriginationContraBalanceIDs, currency, balanceID)
}

func (s *PlatformSettings) LoanSettlementBalanceFor(currency string) string {
	s.Normalize()
	return s.balanceFromMap(s.LoanSettlementBalanceIDs, currency)
}

func (s *PlatformSettings) SetLoanSettlementBalance(currency, balanceID string) {
	s.Normalize()
	s.setBalance(&s.LoanSettlementBalanceIDs, currency, balanceID)
}

// TransferFeeFor returns transfer fee config for a currency.
func (s *PlatformSettings) TransferFeeFor(currency string) TransferFeeConfig {
	s.Normalize()
	if cfg, ok := s.TransferFeeConfigs[normalizeCurrency(currency)]; ok {
		return cfg
	}
	return TransferFeeConfig{}
}

// ExternalTransferFeeFor returns transfer fee config with stamp duty applied.
func (s *PlatformSettings) ExternalTransferFeeFor(currency string) TransferFeeConfig {
	cfg := s.TransferFeeFor(currency)
	if cfg.StampDutyCents == 0 {
		switch normalizeCurrency(currency) {
		case "NGN":
			cfg.StampDutyCents = 1000 // ₦10 stamp duty on external transfers
		case "USD":
			cfg.StampDutyCents = 10
		}
	}
	return cfg
}

// Repository provides access to platform settings.
type Repository struct {
	col *mongo.Collection
}

func NewRepository(col *mongo.Collection) *Repository {
	return &Repository{col: col}
}

// Get retrieves the platform settings document. Returns a zero-value struct if
// the document has not been created yet.
func (r *Repository) Get(ctx context.Context) (*PlatformSettings, error) {
	var doc PlatformSettings
	err := r.col.FindOne(ctx, bson.M{"_id": docID}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		doc.ID = docID
		doc.Normalize()
		return &doc, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get platform settings: %w", err)
	}
	doc.Normalize()
	return &doc, nil
}

// Save upserts the platform settings document.
func (r *Repository) Save(ctx context.Context, s *PlatformSettings) error {
	s.ID = docID
	s.UpdatedAt = time.Now().UTC()
	opts := options.Update().SetUpsert(true)
	_, err := r.col.UpdateOne(ctx,
		bson.M{"_id": docID},
		bson.M{"$set": s},
		opts,
	)
	if err != nil {
		return fmt.Errorf("save platform settings: %w", err)
	}
	return nil
}
