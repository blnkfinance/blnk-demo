package app

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"time"

	adminapi "github.com/blnk-demo/pro-loan-app/backend/internal/admin/api"
	adminrepo "github.com/blnk-demo/pro-loan-app/backend/internal/admin/repository"
	adminservice "github.com/blnk-demo/pro-loan-app/backend/internal/admin/service"
	authapi "github.com/blnk-demo/pro-loan-app/backend/internal/auth/api"
	authservice "github.com/blnk-demo/pro-loan-app/backend/internal/auth/service"
	balancesapi "github.com/blnk-demo/pro-loan-app/backend/internal/balances/api"
	balancesservice "github.com/blnk-demo/pro-loan-app/backend/internal/balances/service"
	"github.com/blnk-demo/pro-loan-app/backend/internal/blnk"
	"github.com/blnk-demo/pro-loan-app/backend/internal/config"
	customerapi "github.com/blnk-demo/pro-loan-app/backend/internal/customer/api"
	customerrepo "github.com/blnk-demo/pro-loan-app/backend/internal/customer/repository"
	customerservice "github.com/blnk-demo/pro-loan-app/backend/internal/customer/service"
	loanledger "github.com/blnk-demo/pro-loan-app/backend/internal/ledger"
	ledgerapi "github.com/blnk-demo/pro-loan-app/backend/internal/ledger/api"
	ledgerrepo "github.com/blnk-demo/pro-loan-app/backend/internal/ledger/repository"
	ledgerservice "github.com/blnk-demo/pro-loan-app/backend/internal/ledger/service"
	loansapi "github.com/blnk-demo/pro-loan-app/backend/internal/loans/api"
	loansrepo "github.com/blnk-demo/pro-loan-app/backend/internal/loans/repository"
	loansservice "github.com/blnk-demo/pro-loan-app/backend/internal/loans/service"
	apimw "github.com/blnk-demo/pro-loan-app/backend/internal/middleware"
	walletapi "github.com/blnk-demo/pro-loan-app/backend/internal/wallet/api"
	walletrepo "github.com/blnk-demo/pro-loan-app/backend/internal/wallet/repository"
	walletservice "github.com/blnk-demo/pro-loan-app/backend/internal/wallet/service"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/mongo"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/redis"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/settings"
	treasuryapi "github.com/blnk-demo/pro-loan-app/backend/internal/platform/treasury/api"
	treasuryservice "github.com/blnk-demo/pro-loan-app/backend/internal/platform/treasury/service"
	productsapi "github.com/blnk-demo/pro-loan-app/backend/internal/products/api"
	productsrepo "github.com/blnk-demo/pro-loan-app/backend/internal/products/repository"
	productsservice "github.com/blnk-demo/pro-loan-app/backend/internal/products/service"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type Server struct {
	cfg        config.Config
	router     chi.Router
	mongo      *mongo.Client
	redis      redis.Client
	blnkClient *blnk.Client
}

func NewServer(ctx context.Context, cfg config.Config) (*Server, func(), error) {
	mongoClient, err := mongo.Connect(ctx, cfg.MongoURI)
	if err != nil {
		return nil, nil, err
	}

	redisClient := redis.Connect(cfg.RedisAddr, cfg.RedisPassword)
	if err := redisClient.Ping(ctx).Err(); err != nil {
		_ = mongoClient.Disconnect(ctx)
		return nil, nil, err
	}

	blnkClient := blnk.NewClient(cfg.BlnkBaseURL, cfg.BlnkAPIKey)
	db := mongoClient.Database(cfg.MongoDatabase)

	// ── Repositories ────────────────────────────────────────────────────────
	adminRepo, err := adminrepo.NewMongo(ctx, db.Collection("admins"))
	if err != nil {
		redisClient.Close()
		_ = mongoClient.Disconnect(ctx)
		return nil, nil, err
	}

	customerRepo, err := customerrepo.NewMongo(ctx, db.Collection("customers"))
	if err != nil {
		redisClient.Close()
		_ = mongoClient.Disconnect(ctx)
		return nil, nil, err
	}

	productRepo, err := productsrepo.NewMongo(ctx, db.Collection("products"))
	if err != nil {
		redisClient.Close()
		_ = mongoClient.Disconnect(ctx)
		return nil, nil, err
	}

	settingsRepo := settings.NewRepository(db.Collection("platform_settings"))

	loanRepo, err := loansrepo.NewMongo(ctx, db.Collection("loans"))
	if err != nil {
		redisClient.Close()
		_ = mongoClient.Disconnect(ctx)
		return nil, nil, err
	}

	ledgerRepo, err := ledgerrepo.NewMongo(ctx, db.Collection("ledger_operations"))
	if err != nil {
		redisClient.Close()
		_ = mongoClient.Disconnect(ctx)
		return nil, nil, err
	}

	// ── Services ────────────────────────────────────────────────────────────
	authSvc := authservice.New(cfg.AuthSecret, customerRepo, adminRepo)
	adminSvc := adminservice.New(adminRepo)
	customerSvc := customerservice.New(customerRepo, blnkClient, settingsRepo)
	productSvc := productsservice.New(productRepo)
	ledgerSvc := ledgerservice.New(ledgerRepo)
	treasurySvc := treasuryservice.New(blnkClient, settingsRepo, ledgerSvc)

	walletRepo, err := walletrepo.NewMongo(ctx, db.Collection("wallet_transactions"))
	if err != nil {
		redisClient.Close()
		_ = mongoClient.Disconnect(ctx)
		return nil, nil, err
	}
	walletSvc := walletservice.New(walletRepo, customerSvc, customerRepo, blnkClient, settingsRepo)

	loanSvc := loansservice.New(loanRepo, productRepo, customerRepo, customerSvc, blnkClient, settingsRepo, ledgerSvc, treasurySvc, walletSvc)
	balanceSvc := balancesservice.New(blnkClient)

	server := &Server{
		cfg:        cfg,
		mongo:      mongoClient,
		redis:      redisClient,
		blnkClient: blnkClient,
	}

	// ── Middleware factories ─────────────────────────────────────────────────
	requireAuth := apimw.RequireAuth(authSvc)
	requireAdmin := apimw.RequireAdmin

	loginRL := apimw.RateLimit(redisClient, "login", 10, time.Minute)
	applyRL := apimw.RateLimit(redisClient, "apply", 5, time.Minute)

	corsOrigins := []string{cfg.AdminFrontendURL, cfg.CustomerFrontendURL}
	if cfg.Environment == "development" {
		corsOrigins = []string{"*"}
	}
	corsMiddleware := apimw.CORS(corsOrigins...)

	// ── Handlers ────────────────────────────────────────────────────────────
	adminH := adminapi.NewHandler(adminSvc)
	customerH := customerapi.NewHandler(customerSvc)
	productH := productsapi.NewHandler(productSvc)
	loanH := loansapi.NewHandler(loanSvc)
	ledgerH := ledgerapi.NewHandler(ledgerSvc)
	balanceH := balancesapi.NewHandler(balanceSvc)
	walletH := walletapi.NewHandler(walletSvc)
	treasuryH := treasuryapi.NewHandler(treasurySvc, ledgerSvc)

	// ── Router ───────────────────────────────────────────────────────────────
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(30 * time.Second))
	r.Use(corsMiddleware)

	r.Get("/health", server.health)
	r.Get("/ready", server.ready)

	r.Route("/api/v1", func(r chi.Router) {
		// ── Fully public ─────────────────────────────────────────────────────
		r.Get("/system/status", server.systemStatus)

		// Blnk webhook (HMAC-signed, not Bearer-authenticated).
		r.Post("/blnk/webhooks", server.blnkWebhook(cfg.BlnkWebhookSecret, ledgerSvc))

		// Auth login — rate-limited, no token required.
		r.Group(func(r chi.Router) {
			r.Use(loginRL)
			authapi.Mount(r, authapi.NewHandler(authSvc))
		})

		// Bootstrap — creates the very first admin (public only when 0 admins exist).
		r.Post("/admins/bootstrap", adminH.Bootstrap)

		// Customer self-registration — public.
		r.Post("/customers", customerH.Register)

		// ── Authenticated (any valid role) ───────────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(requireAuth)

			// Products — read is open to all authenticated users.
			r.Get("/products", productH.List)
			r.Get("/products/{id}", productH.Get)

			// Customer self-service.
			r.Get("/customers/me", customerH.GetMe)
			r.Get("/customers/me/transactions", walletH.ListMyTransactions)
			r.Get("/customers/me/transactions/{id}", walletH.GetMyTransaction)
			r.Get("/config/transfer-fees", walletH.GetTransferFees)
			r.Post("/transfers", walletH.Transfer)

			// Loans — apply is customer action (rate-limited); transitions are admin-only.
			r.Group(func(r chi.Router) {
				r.Use(applyRL)
				r.Post("/loans", loanH.Create)
			})
			r.Get("/loans/quote", loanH.Quote)
			r.Get("/loans", loanH.List)
			r.Get("/loans/{id}", loanH.Get)
			r.Post("/loans/{id}/submit", loanH.Submit)
			r.Post("/loans/{id}/schedule/{schedule_id}/pay", loanH.PayScheduleLine)
			r.Post("/loans/{id}/repay", loanH.RepayNextDue)

			// ── Admin-only ───────────────────────────────────────────────────
			r.Group(func(r chi.Router) {
				r.Use(requireAdmin)

				// Admin management.
				adminapi.Mount(r, adminH)

				// Customers.
				r.Get("/customers", customerH.List)
				r.Get("/customers/{id}", customerH.GetByID)
				r.Post("/customers/{id}/sync-identity", customerH.SyncBlnkIdentity)
				r.Get("/customers/{id}/transactions", walletH.ListCustomerTransactions)

				// Products mutations.
				r.Post("/products", productH.Create)
				r.Patch("/products/{id}", productH.Update)
				r.Post("/products/{id}/archive", productH.Archive)
				r.Post("/products/{id}/unarchive", productH.Unarchive)

				// Loan lifecycle.
				r.Post("/loans/{id}/approve", loanH.Approve)
				r.Post("/loans/{id}/reject", loanH.Reject)
				r.Post("/loans/{id}/disburse", loanH.Disburse)
				r.Post("/loans/{id}/disburse/commit", loanH.CommitDisbursement)
				r.Post("/loans/{id}/disburse/void", loanH.VoidDisbursement)

				// Ledger operations.
				ledgerapi.Mount(r, ledgerH)

				// Blnk balance proxy.
				balancesapi.Mount(r, balanceH)

				// Platform treasury.
				treasuryapi.Mount(r, treasuryH)
			})
		})
	})

	server.router = r

	cleanup := func() {
		redisClient.Close()
		_ = mongoClient.Disconnect(context.Background())
	}

	return server, cleanup, nil
}

func (s *Server) Handler() http.Handler {
	return s.router
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":          true,
		"environment": s.cfg.Environment,
	})
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	if err := s.mongo.Ping(ctx, readpref.Primary()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "mongo": err.Error()})
		return
	}
	if err := s.redis.Ping(ctx).Err(); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "redis": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) systemStatus(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"service":     "pro-loan-app-api",
		"environment": s.cfg.Environment,
		"blnk": map[string]any{
			"base_url":   s.cfg.BlnkBaseURL,
			"configured": s.cfg.BlnkAPIKey != "",
		},
	})
}

type blnkWebhookPayload struct {
	EventType     string `json:"event_type"`
	TransactionID string `json:"transaction_id"`
	Reference     string `json:"reference"`
	Status        string `json:"status"`
	ParentTxID    string `json:"parent_transaction"`
}

func (s *Server) blnkWebhook(webhookSecret string, ledgerSvc loanledger.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "read_error"})
			return
		}

		if webhookSecret != "" {
			sig := r.Header.Get("X-Blnk-Signature")
			if !verifyHMAC(webhookSecret, body, sig) {
				writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "invalid_signature"})
				return
			}
		}

		var payload blnkWebhookPayload
		if err := json.Unmarshal(body, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid_json"})
			return
		}

		if payload.Reference != "" && payload.TransactionID != "" {
			go func() {
				ctx := context.Background()
				op, err := ledgerSvc.GetByReference(ctx, payload.Reference)
				if err != nil {
					return
				}
				switch payload.Status {
				case "APPLIED":
					if _, err := ledgerSvc.MarkPosted(ctx, op.ID, payload.TransactionID, payload.ParentTxID); err != nil {
						slog.Warn("webhook: mark posted failed", "op_id", op.ID, "err", err)
					}
				case "VOID", "REJECTED":
					if _, err := ledgerSvc.MarkFailed(ctx, op.ID, "blnk status: "+payload.Status); err != nil {
						slog.Warn("webhook: mark failed", "op_id", op.ID, "err", err)
					}
				}
			}()
		}

		writeJSON(w, http.StatusAccepted, map[string]any{"ok": true})
	}
}

func verifyHMAC(secret string, body []byte, signature string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
