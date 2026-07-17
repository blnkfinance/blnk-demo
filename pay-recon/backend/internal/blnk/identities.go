package blnk

import "context"

type Identity struct {
	IdentityID       string         `json:"identity_id"`
	IdentityType     string         `json:"identity_type"`
	OrganizationName string         `json:"organization_name,omitempty"`
	MetaData         map[string]any `json:"meta_data"`
}

type CreateIdentityRequest struct {
	IdentityType     string         `json:"identity_type"`
	OrganizationName string         `json:"organization_name,omitempty"`
	MetaData         map[string]any `json:"meta_data,omitempty"`
}

func (c *Client) CreateIdentity(ctx context.Context, req CreateIdentityRequest) (*Identity, error) {
	var out Identity
	if err := c.Post(ctx, "/identities", req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
