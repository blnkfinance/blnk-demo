// Package main implements a one-shot seed command that populates the MongoDB
// database with starter loan products, a demo customer, and a demo admin.
// It is safe to run multiple times; duplicates are skipped.
package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	adminmodel "github.com/blnk-demo/pro-loan-app/backend/internal/admin/model"
	adminrepo "github.com/blnk-demo/pro-loan-app/backend/internal/admin/repository"
	"github.com/blnk-demo/pro-loan-app/backend/internal/config"
	"github.com/blnk-demo/pro-loan-app/backend/internal/customer/model"
	customerrepo "github.com/blnk-demo/pro-loan-app/backend/internal/customer/repository"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/id"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/mongo"
	productmodel "github.com/blnk-demo/pro-loan-app/backend/internal/products/model"
	productsrepo "github.com/blnk-demo/pro-loan-app/backend/internal/products/repository"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("load config", "error", err)
		os.Exit(1)
	}

	mc, err := mongo.Connect(ctx, cfg.MongoURI)
	if err != nil {
		slog.Error("connect mongo", "error", err)
		os.Exit(1)
	}
	defer func() { _ = mc.Disconnect(context.Background()) }()

	db := mc.Database(cfg.MongoDatabase)

	productRepo, err := productsrepo.NewMongo(ctx, db.Collection("products"))
	if err != nil {
		slog.Error("init product repo", "error", err)
		os.Exit(1)
	}

	customerRepo, err := customerrepo.NewMongo(ctx, db.Collection("customers"))
	if err != nil {
		slog.Error("init customer repo", "error", err)
		os.Exit(1)
	}

	aRepo, err := adminrepo.NewMongo(ctx, db.Collection("admins"))
	if err != nil {
		slog.Error("init admin repo", "error", err)
		os.Exit(1)
	}

	seedProducts(ctx, productRepo)
	seedCustomers(ctx, customerRepo)
	seedAdmin(ctx, aRepo)

	slog.Info("seed complete")
}

func seedProducts(ctx context.Context, repo interface {
	List(context.Context, bool) ([]*productmodel.Product, error)
	Create(context.Context, *productmodel.Product) error
}) {
	existing, _ := repo.List(ctx, true)
	existingNames := map[string]bool{}
	for _, p := range existing {
		existingNames[p.Name] = true
	}

	products := []productmodel.Product{
		{
			Name:               "Quick Personal Loan",
			Currency:           "NGN",
			PrincipalMinCents:  50_000,
			PrincipalMaxCents:  500_000,
			AnnualInterestBps:  2000,
			OriginationFeeBps:  150,
			TermMonths:         12,
			RepaymentFrequency: productmodel.FrequencyMonthly,
		},
		{
			Name:               "Home Improvement Loan",
			Currency:           "NGN",
			PrincipalMinCents:  100_000,
			PrincipalMaxCents:  2000_000,
			AnnualInterestBps:  1500,
			OriginationFeeBps:  100,
			TermMonths:         36,
			RepaymentFrequency: productmodel.FrequencyMonthly,
		},
		{
			Name:               "Emergency Micro Loan",
			Currency:           "NGN",
			PrincipalMinCents:  10_000,
			PrincipalMaxCents:  100_000,
			AnnualInterestBps:  3000,
			OriginationFeeBps:  0,
			TermMonths:         6,
			RepaymentFrequency: productmodel.FrequencyMonthly,
		},
	}

	now := time.Now().UTC()
	for _, p := range products {
		if existingNames[p.Name] {
			slog.Info("product already exists, skipping", "name", p.Name)
			continue
		}
		p.ID = id.New()
		p.CreatedAt = now
		p.UpdatedAt = now

		if err := repo.Create(ctx, &p); err != nil {
			slog.Error("create product", "name", p.Name, "error", err)
			continue
		}
		slog.Info("created product", "name", p.Name, "id", p.ID)
	}
}

func seedCustomers(ctx context.Context, repo interface {
	GetByEmail(context.Context, string) (*model.Customer, error)
	Create(context.Context, *model.Customer) error
}) {
	const demoEmail = "demo@example.com"

	if _, err := repo.GetByEmail(ctx, demoEmail); err == nil {
		slog.Info("demo customer already exists, skipping")
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte("demo1234"), bcrypt.DefaultCost)
	now := time.Now().UTC()
	c := &model.Customer{
		ID:           id.New(),
		FirstName:    "Demo",
		LastName:     "Customer",
		Email:        demoEmail,
		Phone:        "+15550001234",
		PasswordHash: string(hash),
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := repo.Create(ctx, c); err != nil {
		slog.Error("create demo customer", "error", err)
		return
	}
	slog.Info("created demo customer", "email", demoEmail, "password", "demo1234")
}

// seedAdmin creates a default admin account if none exists. The credentials
// are printed once to stdout — change the password after first login.
func seedAdmin(ctx context.Context, repo interface {
	Count(context.Context) (int64, error)
	Create(context.Context, *adminmodel.Admin) error
}) {
	count, err := repo.Count(ctx)
	if err != nil {
		slog.Error("count admins", "error", err)
		return
	}
	if count > 0 {
		slog.Info("admin already exists, skipping")
		return
	}

	const (
		seedEmail    = "admin@example.com"
		seedPassword = "Admin1234!"
	)

	hash, _ := bcrypt.GenerateFromPassword([]byte(seedPassword), bcrypt.DefaultCost)
	now := time.Now().UTC()
	a := &adminmodel.Admin{
		ID:           id.New(),
		FirstName:    "Platform",
		LastName:     "Admin",
		Email:        seedEmail,
		PasswordHash: string(hash),
		Status:       adminmodel.StatusActive,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := repo.Create(ctx, a); err != nil {
		slog.Error("create seed admin", "error", err)
		return
	}
	slog.Info("created seed admin — CHANGE THIS PASSWORD after first login",
		"email", seedEmail, "password", seedPassword)
}
