package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/admin"
	"github.com/blnk-demo/pro-loan-app/backend/internal/auth"
	"github.com/blnk-demo/pro-loan-app/backend/internal/auth/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/customer"
	"golang.org/x/crypto/bcrypt"
)

const tokenTTL = 24 * time.Hour

type authService struct {
	secret       []byte
	customerRepo customer.Repository
	adminRepo    admin.Repository
}

// New creates an auth service backed by MongoDB for both admin and customer
// authentication. Both repos may be nil in unit-test contexts, but Login
// calls will return an error in that case.
func New(secret string, customerRepo customer.Repository, adminRepo admin.Repository) auth.Service {
	return &authService{
		secret:       []byte(secret),
		customerRepo: customerRepo,
		adminRepo:    adminRepo,
	}
}

func (s *authService) LoginCustomer(ctx context.Context, input model.LoginInput) (*model.Session, error) {
	if s.customerRepo == nil {
		return nil, fmt.Errorf("customer login not configured")
	}

	c, err := s.customerRepo.GetByEmail(ctx, input.Email)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(c.PasswordHash), []byte(input.Password)); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	exp := time.Now().UTC().Add(tokenTTL)
	token, err := s.sign(model.Claims{
		SubjectID: c.ID,
		Role:      model.RoleCustomer,
		ExpiresAt: exp,
	})
	if err != nil {
		return nil, err
	}

	return &model.Session{
		Token:     token,
		Role:      model.RoleCustomer,
		SubjectID: c.ID,
		ExpiresAt: exp,
	}, nil
}

func (s *authService) LoginAdmin(ctx context.Context, input model.LoginInput) (*model.Session, error) {
	if s.adminRepo == nil {
		return nil, fmt.Errorf("admin login not configured")
	}

	a, err := s.adminRepo.GetByEmail(ctx, strings.ToLower(strings.TrimSpace(input.Email)))
	if err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(a.PasswordHash), []byte(input.Password)); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	exp := time.Now().UTC().Add(tokenTTL)
	token, err := s.sign(model.Claims{
		SubjectID: a.ID,
		Role:      model.RoleAdmin,
		ExpiresAt: exp,
	})
	if err != nil {
		return nil, err
	}

	return &model.Session{
		Token:     token,
		Role:      model.RoleAdmin,
		SubjectID: a.ID,
		ExpiresAt: exp,
	}, nil
}

func (s *authService) ValidateToken(_ context.Context, token string) (*model.Claims, error) {
	return s.verify(token)
}

func (s *authService) RevokeToken(_ context.Context, _ string) error {
	// Token blocklist via Redis will be added in the auth hardening phase.
	return nil
}

func (s *authService) sign(claims model.Claims) (string, error) {
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	encoded := base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, s.secret)
	_, _ = mac.Write([]byte(encoded))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return encoded + "." + sig, nil
}

func (s *authService) verify(token string) (*model.Claims, error) {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("malformed token")
	}

	mac := hmac.New(sha256.New, s.secret)
	_, _ = mac.Write([]byte(parts[0]))
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(parts[1]), []byte(expected)) {
		return nil, fmt.Errorf("invalid token signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("decode token: %w", err)
	}

	var claims model.Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("unmarshal claims: %w", err)
	}

	if time.Now().UTC().After(claims.ExpiresAt) {
		return nil, fmt.Errorf("token expired")
	}

	return &claims, nil
}
