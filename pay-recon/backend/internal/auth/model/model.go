package model

import "time"

const RoleAdmin = "admin"

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Claims struct {
	SubjectID string `json:"sub"`
	Role      string `json:"role"`
	ExpiresAt time.Time
}

type Session struct {
	Token     string    `json:"token"`
	Role      string    `json:"role"`
	SubjectID string    `json:"subject_id"`
	ExpiresAt time.Time `json:"expires_at"`
}

type LoginResponse struct {
	Token string `json:"token"`
	Role  string `json:"role"`
}
