package app

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	accountsapi "github.com/blnk-demo/pay-recon/mock-bank/internal/accounts/api"
	accountsrepo "github.com/blnk-demo/pay-recon/mock-bank/internal/accounts/repository"
	accountsservice "github.com/blnk-demo/pay-recon/mock-bank/internal/accounts/service"
	"github.com/blnk-demo/pay-recon/mock-bank/internal/config"
	"github.com/blnk-demo/pay-recon/mock-bank/internal/platform/postgres"
	statementsapi "github.com/blnk-demo/pay-recon/mock-bank/internal/statements/api"
	statementsrepo "github.com/blnk-demo/pay-recon/mock-bank/internal/statements/repository"
	statementsservice "github.com/blnk-demo/pay-recon/mock-bank/internal/statements/service"
	transfersapi "github.com/blnk-demo/pay-recon/mock-bank/internal/transfers/api"
	transfersrepo "github.com/blnk-demo/pay-recon/mock-bank/internal/transfers/repository"
	transfersservice "github.com/blnk-demo/pay-recon/mock-bank/internal/transfers/service"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

type Server struct {
	cfg      config.Config
	router   chi.Router
	postgres *postgres.Client
}

func NewServer(ctx context.Context, cfg config.Config) (*Server, func(), error) {
	pg, err := postgres.Connect(ctx, cfg.PostgresDSN)
	if err != nil {
		return nil, nil, err
	}
	if err := postgres.Migrate(ctx, pg); err != nil {
		pg.Close()
		return nil, nil, err
	}

	pool := pg.Pool
	accountRepo := accountsrepo.NewPostgres(pool)
	transferRepo := transfersrepo.NewPostgres(pool, accountRepo)

	accountSvc := accountsservice.New(accountRepo)
	transferSvc := transfersservice.New(transferRepo)
	stmtSvc := statementsservice.New(statementsrepo.NewPostgres(pool))

	server := &Server{cfg: cfg, postgres: pg}

	r := chi.NewRouter()
	r.Use(chimw.RequestID, chimw.RealIP, chimw.Recoverer, chimw.Timeout(30*time.Second))
	r.Use(corsMiddleware)
	r.Get("/health", server.health)
	r.Get("/ready", server.ready)

	r.Route("/mock-bank", func(r chi.Router) {
		accountsapi.Mount(r, accountsapi.NewHandler(accountSvc))
		transfersapi.Mount(r, transfersapi.NewHandler(transferSvc))
		statementsapi.Mount(r, statementsapi.NewHandler(stmtSvc))
	})

	server.router = r
	return server, func() { pg.Close() }, nil
}

func (s *Server) Handler() http.Handler { return s.router }

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	if err := s.postgres.Pool.Ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
