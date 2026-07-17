package blnk

import "context"

type UploadResponse struct {
	UploadID    string `json:"upload_id"`
	RecordCount int    `json:"record_count"`
	Source      string `json:"source"`
}

type MatchingRuleCriteria struct {
	Field          string  `json:"field"`
	Operator       string  `json:"operator"`
	Value          string  `json:"value,omitempty"`
	Pattern        string  `json:"pattern,omitempty"`
	AllowableDrift float64 `json:"allowable_drift,omitempty"`
}

type CreateMatchingRuleRequest struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	Criteria    []MatchingRuleCriteria `json:"criteria"`
}

type MatchingRule struct {
	RuleID      string                 `json:"rule_id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Criteria    []MatchingRuleCriteria `json:"criteria"`
}

type StartReconciliationRequest struct {
	UploadID        string   `json:"upload_id"`
	Strategy        string   `json:"strategy"`
	MatchingRuleIDs []string `json:"matching_rule_ids"`
	DryRun          bool     `json:"dry_run,omitempty"`
}

type StartReconciliationResponse struct {
	ReconciliationID string `json:"reconciliation_id"`
}

type Reconciliation struct {
	ReconciliationID      string `json:"reconciliation_id"`
	UploadID              string `json:"upload_id"`
	Status                string `json:"status"`
	MatchedTransactions   int    `json:"matched_transactions"`
	UnmatchedTransactions int    `json:"unmatched_transactions"`
	IsDryRun              bool   `json:"is_dry_run"`
	StartedAt             string `json:"started_at"`
	CompletedAt           string `json:"completed_at"`
}

func (c *Client) CreateMatchingRule(ctx context.Context, req CreateMatchingRuleRequest) (*MatchingRule, error) {
	var out MatchingRule
	if err := c.Post(ctx, "/reconciliation/matching-rules", req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) ListMatchingRules(ctx context.Context) ([]MatchingRule, error) {
	var out []MatchingRule
	if err := c.Get(ctx, "/reconciliation/matching-rules", &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) StartReconciliation(ctx context.Context, req StartReconciliationRequest) (*StartReconciliationResponse, error) {
	var out StartReconciliationResponse
	if err := c.Post(ctx, "/reconciliation/start", req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) GetReconciliation(ctx context.Context, reconciliationID string) (*Reconciliation, error) {
	var out Reconciliation
	if err := c.Get(ctx, "/reconciliation/"+reconciliationID, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
