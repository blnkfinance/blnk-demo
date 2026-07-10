package blnk

import (
	"context"
	"fmt"
	"strings"
)

// Transaction mirrors the Blnk transaction response object.
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
	MetaData          map[string]any `json:"meta_data"`
	CreatedAt         string         `json:"created_at"`
}

// CreateTransactionRequest is sent to POST /transactions.
type CreateTransactionRequest struct {
	Amount         int64          `json:"amount,omitempty"`
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

// CommitInflight commits an inflight transaction, moving it to APPLIED.
func (c *Client) CommitInflight(ctx context.Context, transactionID string, amount *int64) (*Transaction, error) {
	body := map[string]any{"status": "commit", "skip_queue": true}
	if amount != nil {
		body["precise_amount"] = *amount
	}
	var out Transaction
	path := fmt.Sprintf("/transactions/inflight/%s", transactionID)
	if err := c.Put(ctx, path, body, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// VoidInflight voids an inflight transaction.
func (c *Client) VoidInflight(ctx context.Context, transactionID string) (*Transaction, error) {
	var out Transaction
	path := fmt.Sprintf("/transactions/inflight/%s", transactionID)
	if err := c.Put(ctx, path, map[string]any{"status": "void", "skip_queue": true}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// RefundTransaction creates a refund for a settled transaction.
func (c *Client) RefundTransaction(ctx context.Context, transactionID string) (*Transaction, error) {
	var out Transaction
	path := fmt.Sprintf("/refund-transaction/%s", transactionID)
	if err := c.Post(ctx, path, map[string]any{}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// PostLeg posts a single ledger leg with precise amount and shared metadata.
// skipQueue processes synchronously so Blnk does not append "_q" to references.
func (c *Client) PostLeg(
	ctx context.Context,
	precision int64,
	reference, currency, source, destination, description string,
	amountCents int64,
	inflight, allowOverdraft, skipQueue bool,
	meta map[string]any,
) (*Transaction, error) {
	if meta == nil {
		meta = map[string]any{}
	}
	return c.CreateTransaction(ctx, CreateTransactionRequest{
		PreciseAmount:  amountCents,
		Precision:      precision,
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

// IsDuplicateReferenceError reports Blnk idempotency collisions.
func IsDuplicateReferenceError(err error) bool {
	return err != nil && strings.Contains(err.Error(), "already been used")
}

// FindTransactionByReference looks up an existing transaction by reference, including
// Blnk's queued suffix form (reference_q).
func (c *Client) FindTransactionByReference(ctx context.Context, reference string) (*Transaction, error) {
	for _, ref := range []string{reference, reference + "_q"} {
		var out struct {
			Hits []struct {
				Document Transaction `json:"document"`
			} `json:"hits"`
		}
		err := c.Post(ctx, "/search/transactions", map[string]any{
			"q":        ref,
			"query_by": "reference",
		}, &out)
		if err != nil {
			continue
		}
		if len(out.Hits) > 0 && out.Hits[0].Document.TransactionID != "" {
			return &out.Hits[0].Document, nil
		}
	}
	return nil, fmt.Errorf("transaction not found for reference %s", reference)
}
