package blnk

import "context"

// Identity mirrors the Blnk identity response object.
type Identity struct {
	IdentityID       string         `json:"identity_id"`
	IdentityType     string         `json:"identity_type"`
	OrganizationName string         `json:"organization_name,omitempty"`
	FirstName        string         `json:"first_name,omitempty"`
	LastName         string         `json:"last_name,omitempty"`
	EmailAddress     string         `json:"email_address,omitempty"`
	MetaData         map[string]any `json:"meta_data"`
}

// CreateIdentityRequest is sent to POST /identities.
type CreateIdentityRequest struct {
	IdentityType     string         `json:"identity_type"`
	OrganizationName string         `json:"organization_name,omitempty"`
	FirstName        string         `json:"first_name,omitempty"`
	LastName         string         `json:"last_name,omitempty"`
	EmailAddress     string         `json:"email_address,omitempty"`
	PhoneNumber      string         `json:"phone_number,omitempty"`
	Category         string         `json:"category,omitempty"`
	MetaData         map[string]any `json:"meta_data,omitempty"`
}

func (c *Client) CreateIdentity(ctx context.Context, req CreateIdentityRequest) (*Identity, error) {
	var out Identity
	if err := c.Post(ctx, "/identities", req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) GetIdentity(ctx context.Context, identityID string) (*Identity, error) {
	var out Identity
	if err := c.Get(ctx, "/identities/"+identityID, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
