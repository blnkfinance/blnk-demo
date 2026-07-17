package app

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sync/atomic"
	"time"

	adminapi "github.com/blnk-demo/pay-recon/backend/internal/admin/api"
	adminrepo "github.com/blnk-demo/pay-recon/backend/internal/admin/repository"
	adminservice "github.com/blnk-demo/pay-recon/backend/internal/admin/service"
	authapi "github.com/blnk-demo/pay-recon/backend/internal/auth/api"
	authservice "github.com/blnk-demo/pay-recon/backend/internal/auth/service"
	billsapi "github.com/blnk-demo/pay-recon/backend/internal/bills/api"
	billsrepo "github.com/blnk-demo/pay-recon/backend/internal/bills/repository"
	billsservice "github.com/blnk-demo/pay-recon/backend/internal/bills/service"
	"github.com/blnk-demo/pay-recon/backend/internal/blnk"
	"github.com/blnk-demo/pay-recon/backend/internal/config"
	merchantsapi "github.com/blnk-demo/pay-recon/backend/internal/merchants/api"
	merchantsrepo "github.com/blnk-demo/pay-recon/backend/internal/merchants/repository"
	merchantsservice "github.com/blnk-demo/pay-recon/backend/internal/merchants/service"
	apimw "github.com/blnk-demo/pay-recon/backend/internal/middleware"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnkaccounts"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnksetup"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/postgres"
	reconciliationapi "github.com/blnk-demo/pay-recon/backend/internal/reconciliation/api"
	reconciliationrepo "github.com/blnk-demo/pay-recon/backend/internal/reconciliation/repository"
	reconciliationservice "github.com/blnk-demo/pay-recon/backend/internal/reconciliation/service"
	remittancesapi "github.com/blnk-demo/pay-recon/backend/internal/remittances/api"
	remittancesrepo "github.com/blnk-demo/pay-recon/backend/internal/remittances/repository"
	remittancesservice "github.com/blnk-demo/pay-recon/backend/internal/remittances/service"
	treasuryapi "github.com/blnk-demo/pay-recon/backend/internal/treasury/api"
	treasuryservice "github.com/blnk-demo/pay-recon/backend/internal/treasury/service"
	whtcategoriesapi "github.com/blnk-demo/pay-recon/backend/internal/whtcategories/api"
	whtcategoriesrepo "github.com/blnk-demo/pay-recon/backend/internal/whtcategories/repository"
	whtcategoriesservice "github.com/blnk-demo/pay-recon/backend/internal/whtcategories/service"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

type Server struct {
	cfg            config.Config
	router         chi.Router
	postgres       *postgres.Client
	blnkClient     *blnk.Client
	bootstrapReady atomic.Bool
}

func NewServer(ctx context.Context, cfg config.Config) (*Server, func(), error) {
	pg, err := postgres.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, nil, err
	}
	if err := postgres.Migrate(ctx, pg); err != nil {
		pg.Close()
		return nil, nil, err
	}

	blnkClient := blnk.NewClient(cfg.BlnkBaseURL, cfg.BlnkAPIKey)
	pool := pg.Pool
	accountsRepo := blnkaccounts.NewRepository(pool)

	if err := whtcategoriesservice.SeedDefaults(ctx, whtcategoriesrepo.NewPostgres(pool)); err != nil {
		pg.Close()
		return nil, nil, err
	}

	adminRepo := adminrepo.NewPostgres(pool)
	authSvc := authservice.New(cfg.AuthSecret, adminRepo)
	adminSvc := adminservice.New(adminRepo)

	merchantRepo := merchantsrepo.NewPostgres(pool)
	merchantSvc := merchantsservice.New(merchantRepo, blnkClient, cfg, func(ctx context.Context) (string, error) {
		return blnksetup.LedgerID(ctx, accountsRepo)
	})

	whtRepo := whtcategoriesrepo.NewPostgres(pool)
	whtSvc := whtcategoriesservice.New(whtRepo)

	billRepo := billsrepo.NewPostgres(pool)
	billSvc := billsservice.New(billRepo, merchantRepo, whtRepo, accountsRepo, blnkClient, cfg)

	remittanceRepo := remittancesrepo.NewPostgres(pool)
	reconRepo := reconciliationrepo.NewPostgres(pool)
	reconSvc := reconciliationservice.New(reconRepo, billRepo, merchantRepo, remittanceRepo, accountsRepo, blnkClient, cfg)

	remittanceSvc := remittancesservice.New(remittanceRepo, pool, accountsRepo, blnkClient, cfg)
	treasurySvc := treasuryservice.New(accountsRepo, blnkClient, cfg)

	server := &Server{cfg: cfg, postgres: pg, blnkClient: blnkClient}

	requireAuth := apimw.RequireAuth(authSvc)
	requireAdmin := apimw.RequireAdmin

	corsOrigins := []string{cfg.AdminFrontendURL}
	if cfg.Environment == "development" {
		corsOrigins = []string{"*"}
	}

	adminH := adminapi.NewHandler(adminSvc)
	merchantH := merchantsapi.NewHandler(merchantSvc)
	whtH := whtcategoriesapi.NewHandler(whtSvc)
	billH := billsapi.NewHandler(billSvc)
	reconH := reconciliationapi.NewHandler(reconSvc)
	remittanceH := remittancesapi.NewHandler(remittanceSvc)
	treasuryH := treasuryapi.NewHandler(treasurySvc)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(60 * time.Second))
	r.Use(apimw.CORS(corsOrigins...))

	r.Get("/health", server.health)
	r.Get("/ready", server.ready)

	r.Route("/api/v1", func(r chi.Router) {
		authapi.Mount(r, authapi.NewHandler(authSvc))
		r.Post("/admins/bootstrap", adminH.Bootstrap)
	})

	r.Route("/api", func(r chi.Router) {
		r.Use(requireAuth)
		r.Use(requireAdmin)

		merchantsapi.Mount(r, merchantH)
		whtcategoriesapi.Mount(r, whtH)
		billsapi.Mount(r, billH)
		reconciliationapi.Mount(r, reconH)
		remittancesapi.Mount(r, remittanceH)
		treasuryapi.Mount(r, treasuryH)
		adminapi.Mount(r, adminH)
	})

	server.router = r

	go func() {
		bsCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		if err := blnksetup.Bootstrap(bsCtx, cfg, blnkClient, accountsRepo); err != nil {
			slog.Error("blnk bootstrap failed — ledger features may not work until restart", "error", err)
			server.bootstrapReady.Store(false)
		} else {
			server.bootstrapReady.Store(true)
			slog.Info("blnk platform bootstrapped")
		}
	}()

	cleanup := func() { pg.Close() }
	return server, cleanup, nil
}

func (s *Server) Handler() http.Handler {
	return s.router
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "service": "pay-recon-api"})
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	if err := s.postgres.Pool.Ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "reason": "postgres"})
		return
	}
	if !s.bootstrapReady.Load() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "reason": "blnk_bootstrap"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
