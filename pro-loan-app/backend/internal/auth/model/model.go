package model

import "time"

type Role string

const (
	RoleCustomer Role = "customer"
	RoleAdmin    Role = "admin"
)

type Session struct {
	Token     string    `json:"token"`
	Role      Role      `json:"role"`
	SubjectID string    `json:"subject_id"`
	ExpiresAt time.Time `json:"expires_at"`
}

type Claims struct {
	SubjectID string
	Role      Role
	ExpiresAt time.Time
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Admin holds admin user credentials stored separately from customers.
type Admin struct {
	ID           string    `bson:"_id" json:"id"`
	Email        string    `bson:"email" json:"email"`
	PasswordHash string    `bson:"password_hash" json:"-"`
	CreatedAt    time.Time `bson:"created_at" json:"created_at"`
}
