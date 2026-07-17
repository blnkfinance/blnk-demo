package blnk

import "context"

type Ledger struct {
	LedgerID  string         `json:"ledger_id"`
	Name      string         `json:"name"`
	MetaData  map[string]any `json:"meta_data"`
	CreatedAt string         `json:"created_at"`
}

type CreateLedgerRequest struct {
	Name     string         `json:"name"`
	MetaData map[string]any `json:"meta_data,omitempty"`
}

func (c *Client) CreateLedger(ctx context.Context, req CreateLedgerRequest) (*Ledger, error) {
	var out Ledger
	if err := c.Post(ctx, "/ledgers", req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) GetLedger(ctx context.Context, ledgerID string) (*Ledger, error) {
	var out Ledger
	if err := c.Get(ctx, "/ledgers/"+ledgerID, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
