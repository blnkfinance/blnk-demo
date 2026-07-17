package blnk

import (
	"context"
	"fmt"
	"strings"
)

type Transaction struct {
	TransactionID     string         `json:"transaction_id"`
	ParentTransaction string         `json:"parent_transaction"`
	Source            string         `json:"source"`
	Destination       string         `json:"destination"`
	Reference         string         `json:"reference"`
	Amount            float64        `json:"amount"`
	PreciseAmount     int64          `json:"precise_amount"`
	Precision         int64          `json:"precision"`
	Currency          string         `json:"currency"`
	Status            string         `json:"status"`
	Description       string         `json:"description"`
	AllowOverdraft    bool           `json:"allow_overdraft"`
	Inflight          bool           `json:"inflight"`
	MetaData          map[string]any `json:"meta_data"`
	CreatedAt         string         `json:"created_at"`
}

type CreateTransactionRequest struct {
	PreciseAmount  int64          `json:"precise_amount,omitempty"`
	Precision      int64          `json:"precision,omitempty"`
	Reference      string         `json:"reference"`
	Currency       string         `json:"currency"`
	Source         string         `json:"source"`
	Destination    string         `json:"destination"`
	Description    string         `json:"description,omitempty"`
	Inflight       bool           `json:"inflight,omitempty"`
	AllowOverdraft bool           `json:"allow_overdraft,omitempty"`
	SkipQueue      bool           `json:"skip_queue,omitempty"`
	MetaData       map[string]any `json:"meta_data,omitempty"`
}

func (c *Client) CreateTransaction(ctx context.Context, req CreateTransactionRequest) (*Transaction, error) {
	var out Transaction
	if err := c.Post(ctx, "/transactions", req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) GetTransaction(ctx context.Context, transactionID string) (*Transaction, error) {
	var out Transaction
	if err := c.Get(ctx, "/transactions/"+transactionID, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) CommitInflight(ctx context.Context, transactionID string) (*Transaction, error) {
	var out Transaction
	path := fmt.Sprintf("/transactions/inflight/%s", transactionID)
	if err := c.Put(ctx, path, map[string]any{"status": "commit", "skip_queue": true}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) VoidInflight(ctx context.Context, transactionID string) (*Transaction, error) {
	var out Transaction
	path := fmt.Sprintf("/transactions/inflight/%s", transactionID)
	if err := c.Put(ctx, path, map[string]any{"status": "void", "skip_queue": true}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) PostLeg(
	ctx context.Context,
	reference, currency, source, destination, description string,
	amountKobo int64,
	inflight, skipQueue, allowOverdraft bool,
	meta map[string]any,
) (*Transaction, error) {
	if meta == nil {
		meta = map[string]any{}
	}
	return c.CreateTransaction(ctx, CreateTransactionRequest{
		PreciseAmount:  amountKobo,
		Precision:      DefaultPrecision,
		Reference:      reference,
		Currency:       currency,
		Source:         source,
		Destination:    destination,
		Description:    description,
		Inflight:       inflight,
		AllowOverdraft: allowOverdraft,
		SkipQueue:      skipQueue,
		MetaData:       meta,
	})
}

func IsDuplicateReferenceError(err error) bool {
	return err != nil && strings.Contains(err.Error(), "already been used")
}

// IsInflightAlreadyHandledError reports commit retries where the inflight txn is already applied.
func IsInflightAlreadyHandledError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "already") ||
		strings.Contains(msg, "not inflight") ||
		strings.Contains(msg, "committed") ||
		strings.Contains(msg, "applied")
}

// IsNotFoundError reports Blnk lookups that return no matching row (e.g. indicator not created yet).
func IsNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "no rows in result set") ||
		strings.Contains(msg, "not found") ||
		strings.Contains(msg, "status=404")
}

func (t *Transaction) Reconciled() bool {
	if t == nil || t.MetaData == nil {
		return false
	}
	v, ok := t.MetaData["reconciled"].(bool)
	return ok && v
}
