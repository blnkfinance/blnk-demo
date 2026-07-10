package model

import (
	"strings"
	"time"
)

type Role string

const (
	RoleCustomer Role = "customer"
	RoleAdmin    Role = "admin"
)

const DefaultCurrency = "NGN"

type Customer struct {
	ID                       string            `bson:"_id" json:"id"`
	FirstName                string            `bson:"first_name" json:"first_name"`
	LastName                 string            `bson:"last_name" json:"last_name"`
	Email                    string            `bson:"email" json:"email"`
	Phone                    string            `bson:"phone" json:"phone"`
	PasswordHash             string            `bson:"password_hash,omitempty" json:"-"`
	BlnkIdentityID           string            `bson:"blnk_identity_id,omitempty" json:"blnk_identity_id,omitempty"`
	WalletBalanceIDs         map[string]string `bson:"wallet_balance_ids,omitempty" json:"wallet_balance_ids,omitempty"`
	LoanReceivableBalanceIDs map[string]string `bson:"loan_receivable_balance_ids,omitempty" json:"loan_receivable_balance_ids,omitempty"`
	WalletBalanceID          string            `bson:"wallet_balance_id,omitempty" json:"wallet_balance_id,omitempty"` // legacy
	CreatedAt                time.Time         `bson:"created_at" json:"created_at"`
	UpdatedAt                time.Time         `bson:"updated_at" json:"updated_at"`
}

// Normalize migrates legacy single wallet balance storage.
func (c *Customer) Normalize() {
	if c.WalletBalanceIDs == nil {
		c.WalletBalanceIDs = make(map[string]string)
	}
	if c.LoanReceivableBalanceIDs == nil {
		c.LoanReceivableBalanceIDs = make(map[string]string)
	}
	if c.WalletBalanceID != "" {
		if _, ok := c.WalletBalanceIDs[DefaultCurrency]; !ok {
			c.WalletBalanceIDs[DefaultCurrency] = c.WalletBalanceID
		}
	}
}

func normalizeCurrency(currency string) string {
	return strings.ToUpper(strings.TrimSpace(currency))
}

func (c *Customer) WalletBalanceFor(currency string) string {
	c.Normalize()
	return c.WalletBalanceIDs[normalizeCurrency(currency)]
}

func (c *Customer) SetWalletBalance(currency, balanceID string) {
	c.Normalize()
	c.WalletBalanceIDs[normalizeCurrency(currency)] = balanceID
}

func (c *Customer) LoanReceivableBalanceFor(currency string) string {
	c.Normalize()
	return c.LoanReceivableBalanceIDs[normalizeCurrency(currency)]
}

func (c *Customer) SetLoanReceivableBalance(currency, balanceID string) {
	c.Normalize()
	c.LoanReceivableBalanceIDs[normalizeCurrency(currency)] = balanceID
}

type CreateCustomerInput struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Password  string `json:"password"`
}
