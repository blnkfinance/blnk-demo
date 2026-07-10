package service_test

import (
	"context"
	"fmt"
	"testing"

	adminmodel "github.com/blnk-demo/pro-loan-app/backend/internal/admin/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/auth/model"
	authservice "github.com/blnk-demo/pro-loan-app/backend/internal/auth/service"
	"golang.org/x/crypto/bcrypt"
)

// stubAdminRepo is a minimal in-memory admin repo for auth service tests.
type stubAdminRepo struct {
	admins map[string]*adminmodel.Admin
}

func newStubAdminRepo(email, password string) *stubAdminRepo {
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	return &stubAdminRepo{
		admins: map[string]*adminmodel.Admin{
			email: {
				ID:           "admin-1",
				Email:        email,
				PasswordHash: string(hash),
				Status:       adminmodel.StatusActive,
			},
		},
	}
}

func (r *stubAdminRepo) Create(_ context.Context, _ *adminmodel.Admin) error { return nil }
func (r *stubAdminRepo) GetByID(_ context.Context, _ string) (*adminmodel.Admin, error) {
	return nil, nil
}
func (r *stubAdminRepo) GetByEmail(_ context.Context, email string) (*adminmodel.Admin, error) {
	a, ok := r.admins[email]
	if !ok {
		return nil, fmt.Errorf("not found")
	}
	return a, nil
}
func (r *stubAdminRepo) Update(_ context.Context, _ *adminmodel.Admin) error { return nil }
func (r *stubAdminRepo) List(_ context.Context, _, _ int) ([]*adminmodel.Admin, int64, error) {
	return nil, 0, nil
}
func (r *stubAdminRepo) Count(_ context.Context) (int64, error) { return 1, nil }

func TestLoginAdmin_ValidCredentials(t *testing.T) {
	svc := authservice.New("test-secret", nil, newStubAdminRepo("admin@test.com", "password123"))

	session, err := svc.LoginAdmin(context.Background(), model.LoginInput{
		Email:    "admin@test.com",
		Password: "password123",
	})

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if session.Token == "" {
		t.Error("expected non-empty token")
	}
	if session.Role != model.RoleAdmin {
		t.Errorf("expected role admin, got %s", session.Role)
	}
	if session.SubjectID == "" {
		t.Error("expected non-empty subject_id")
	}
}

func TestLoginAdmin_InvalidCredentials(t *testing.T) {
	svc := authservice.New("test-secret", nil, newStubAdminRepo("admin@test.com", "password123"))

	_, err := svc.LoginAdmin(context.Background(), model.LoginInput{
		Email:    "admin@test.com",
		Password: "wrong-password",
	})

	if err == nil {
		t.Fatal("expected error for invalid credentials, got nil")
	}
}

func TestValidateToken_Valid(t *testing.T) {
	svc := authservice.New("test-secret", nil, newStubAdminRepo("admin@test.com", "password123"))

	session, err := svc.LoginAdmin(context.Background(), model.LoginInput{
		Email:    "admin@test.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}

	claims, err := svc.ValidateToken(context.Background(), session.Token)
	if err != nil {
		t.Fatalf("expected valid token, got: %v", err)
	}
	if claims.Role != model.RoleAdmin {
		t.Errorf("expected role admin, got %s", claims.Role)
	}
}

func TestValidateToken_InvalidSignature(t *testing.T) {
	svc := authservice.New("test-secret", nil, newStubAdminRepo("admin@test.com", "password123"))

	_, err := svc.ValidateToken(context.Background(), "bad.token")
	if err == nil {
		t.Fatal("expected error for bad token")
	}
}

func TestValidateToken_Tampered(t *testing.T) {
	svc := authservice.New("test-secret", nil, newStubAdminRepo("admin@test.com", "password123"))

	session, _ := svc.LoginAdmin(context.Background(), model.LoginInput{
		Email:    "admin@test.com",
		Password: "password123",
	})

	token := session.Token
	tamperedToken := token[:len(token)-1] + "X"

	_, err := svc.ValidateToken(context.Background(), tamperedToken)
	if err == nil {
		t.Fatal("expected error for tampered token")
	}
}
