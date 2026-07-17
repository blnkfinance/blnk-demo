package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/admin/model"
	adminrepo "github.com/blnk-demo/pay-recon/backend/internal/admin/repository"
	adminservice "github.com/blnk-demo/pay-recon/backend/internal/admin/service"
	"github.com/blnk-demo/pay-recon/backend/internal/config"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/postgres"
	whtcategoriesrepo "github.com/blnk-demo/pay-recon/backend/internal/whtcategories/repository"
	whtcategoriesservice "github.com/blnk-demo/pay-recon/backend/internal/whtcategories/service"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("load config", "error", err)
		os.Exit(1)
	}

	pg, err := postgres.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("postgres connect", "error", err)
		os.Exit(1)
	}
	defer pg.Close()

	if err := postgres.Migrate(ctx, pg); err != nil {
		slog.Error("migrate", "error", err)
		os.Exit(1)
	}

	if err := whtcategoriesservice.SeedDefaults(ctx, whtcategoriesrepo.NewPostgres(pg.Pool)); err != nil {
		slog.Error("seed wht categories", "error", err)
		os.Exit(1)
	}

	adminSvc := adminservice.New(adminrepo.NewPostgres(pg.Pool))
	hasAny, err := adminSvc.HasAny(ctx)
	if err != nil {
		slog.Error("check admins", "error", err)
		os.Exit(1)
	}
	if !hasAny {
		if _, err := adminSvc.Create(ctx, model.CreateAdminInput{
			Email:     "accountant@payrecon.local",
			FirstName: "Demo",
			LastName:  "Accountant",
			Password:  "changeme123",
		}); err != nil {
			slog.Error("seed admin", "error", err)
			os.Exit(1)
		}
		slog.Info("seeded demo accountant", "email", "accountant@payrecon.local")
	}

	slog.Info("seed complete — run Blnk bootstrap via API startup or: go run ./scripts/seed_blnk.go")
}
