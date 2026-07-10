package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/admin"
	"github.com/blnk-demo/pro-loan-app/backend/internal/admin/model"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/id"
	"golang.org/x/crypto/bcrypt"
)

type adminService struct {
	repo admin.Repository
}

func New(repo admin.Repository) admin.Service {
	return &adminService{repo: repo}
}

func (s *adminService) Create(ctx context.Context, input model.CreateAdminInput) (*model.Admin, error) {
	if strings.TrimSpace(input.FirstName) == "" {
		return nil, fmt.Errorf("first_name is required")
	}
	if strings.TrimSpace(input.LastName) == "" {
		return nil, fmt.Errorf("last_name is required")
	}
	if strings.TrimSpace(input.Email) == "" {
		return nil, fmt.Errorf("email is required")
	}
	if len(input.Password) < 8 {
		return nil, fmt.Errorf("password must be at least 8 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	now := time.Now().UTC()
	a := &model.Admin{
		ID:           id.New(),
		FirstName:    strings.TrimSpace(input.FirstName),
		LastName:     strings.TrimSpace(input.LastName),
		Email:        strings.ToLower(strings.TrimSpace(input.Email)),
		PasswordHash: string(hash),
		Status:       model.StatusActive,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.repo.Create(ctx, a); err != nil {
		return nil, fmt.Errorf("create admin: %w", err)
	}

	return a, nil
}

func (s *adminService) GetByID(ctx context.Context, id string) (*model.Admin, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *adminService) GetByEmail(ctx context.Context, email string) (*model.Admin, error) {
	return s.repo.GetByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
}

func (s *adminService) List(ctx context.Context, page, pageSize int) ([]*model.Admin, int64, error) {
	return s.repo.List(ctx, page, pageSize)
}

func (s *adminService) Update(ctx context.Context, adminID string, input model.UpdateAdminInput) (*model.Admin, error) {
	a, err := s.repo.GetByID(ctx, adminID)
	if err != nil {
		return nil, fmt.Errorf("admin not found: %w", err)
	}

	if input.FirstName != nil && strings.TrimSpace(*input.FirstName) != "" {
		a.FirstName = strings.TrimSpace(*input.FirstName)
	}
	if input.LastName != nil && strings.TrimSpace(*input.LastName) != "" {
		a.LastName = strings.TrimSpace(*input.LastName)
	}
	if input.Password != nil {
		if len(*input.Password) < 8 {
			return nil, fmt.Errorf("password must be at least 8 characters")
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(*input.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("hash password: %w", err)
		}
		a.PasswordHash = string(hash)
	}

	a.UpdatedAt = time.Now().UTC()
	if err := s.repo.Update(ctx, a); err != nil {
		return nil, fmt.Errorf("update admin: %w", err)
	}

	return a, nil
}

func (s *adminService) HasAny(ctx context.Context) (bool, error) {
	count, err := s.repo.Count(ctx)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
