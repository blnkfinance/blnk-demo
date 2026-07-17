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

	"github.com/blnk-demo/pay-recon/backend/internal/admin"
	"github.com/blnk-demo/pay-recon/backend/internal/auth"
	"github.com/blnk-demo/pay-recon/backend/internal/auth/model"
	"golang.org/x/crypto/bcrypt"
)

const tokenTTL = 24 * time.Hour

type authService struct {
	secret    []byte
	adminRepo admin.Repository
}

func New(secret string, adminRepo admin.Repository) auth.Service {
	return &authService{
		secret:    []byte(secret),
		adminRepo: adminRepo,
	}
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
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid token")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid token")
	}

	var claims model.Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("invalid token")
	}

	if time.Now().UTC().After(claims.ExpiresAt) {
		return nil, fmt.Errorf("token expired")
	}

	mac := hmac.New(sha256.New, s.secret)
	mac.Write(payload)
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(parts[1])) {
		return nil, fmt.Errorf("invalid token")
	}

	return &claims, nil
}

func (s *authService) sign(claims model.Claims) (string, error) {
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	mac := hmac.New(sha256.New, s.secret)
	mac.Write(payload)
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return base64.RawURLEncoding.EncodeToString(payload) + "." + sig, nil
}
