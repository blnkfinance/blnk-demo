package model

import "time"

type AdminStatus string

const (
	StatusActive   AdminStatus = "active"
	StatusInactive AdminStatus = "inactive"
)

// Admin is a platform staff member who can manage loans, customers, and products.
type Admin struct {
	ID           string      `bson:"_id"           json:"id"`
	FirstName    string      `bson:"first_name"    json:"first_name"`
	LastName     string      `bson:"last_name"     json:"last_name"`
	Email        string      `bson:"email"         json:"email"`
	PasswordHash string      `bson:"password_hash" json:"-"`
	Status       AdminStatus `bson:"status"        json:"status"`
	CreatedAt    time.Time   `bson:"created_at"    json:"created_at"`
	UpdatedAt    time.Time   `bson:"updated_at"    json:"updated_at"`
}

type CreateAdminInput struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

type UpdateAdminInput struct {
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
	Password  *string `json:"password,omitempty"`
}
