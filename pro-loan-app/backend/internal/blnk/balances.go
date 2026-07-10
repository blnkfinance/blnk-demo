package blnk

import (
	"context"
	"fmt"
	"net/url"
	"strings"
)

// Balance mirrors the Blnk balance response object.
type Balance struct {
	BalanceID  string         `json:"balance_id"`
	LedgerID   string         `json:"ledger_id"`
	IdentityID string         `json:"identity_id"`
	Indicator  string         `json:"indicator,omitempty"`
	Currency   string         `json:"currency"`
	Balance    float64        `json:"balance"`
	MetaData   map[string]any `json:"meta_data"`
	CreatedAt  string         `json:"created_at"`
}

// CreateBalanceRequest is sent to POST /balances.
type CreateBalanceRequest struct {
	LedgerID   string         `json:"ledger_id"`
	IdentityID string         `json:"identity_id,omitempty"`
	Currency   string         `json:"currency"`
	MetaData   map[string]any `json:"meta_data,omitempty"`
}

func (c *Client) CreateBalance(ctx context.Context, req CreateBalanceRequest) (*Balance, error) {
	var out Balance
	if err := c.Post(ctx, "/balances", req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) GetBalance(ctx context.Context, balanceID string) (*Balance, error) {
	var out Balance
	if err := c.Get(ctx, "/balances/"+balanceID, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// GetBalanceByIndicator looks up a General Ledger internal balance by its @ indicator.
func (c *Client) GetBalanceByIndicator(ctx context.Context, indicator, currency string) (*Balance, error) {
	indicator = strings.TrimSpace(indicator)
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if indicator == "" || currency == "" {
		return nil, fmt.Errorf("indicator and currency are required")
	}

	path := fmt.Sprintf(
		"/balances/indicator/%s/currency/%s",
		url.PathEscape(indicator),
		url.PathEscape(currency),
	)

	var out Balance
	if err := c.Get(ctx, path, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// UpdateBalanceIdentity links an identity to an existing balance.
func (c *Client) UpdateBalanceIdentity(ctx context.Context, balanceID, identityID string) (*Balance, error) {
	var out Balance
	if err := c.Put(ctx, "/balances/"+balanceID+"/identity", map[string]string{
		"identity_id": identityID,
	}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
