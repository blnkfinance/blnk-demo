// Package app_test contains HTTP-level integration tests for the API server.
// Tests use httptest to spin up the router without real Mongo/Redis; service
// dependencies are replaced by lightweight stubs so these tests run without
// external infrastructure.
package app_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	adminmodel "github.com/blnk-demo/pro-loan-app/backend/internal/admin/model"
	authapi "github.com/blnk-demo/pro-loan-app/backend/internal/auth/api"
	authmodel "github.com/blnk-demo/pro-loan-app/backend/internal/auth/model"
	authsvc "github.com/blnk-demo/pro-loan-app/backend/internal/auth/service"
	apimw "github.com/blnk-demo/pro-loan-app/backend/internal/middleware"
	productsapi "github.com/blnk-demo/pro-loan-app/backend/internal/products/api"
	"github.com/blnk-demo/pro-loan-app/backend/internal/products/model"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"golang.org/x/crypto/bcrypt"
)

// ─────────────────────────────────────────────────────────────────────────────
// Stubs
// ─────────────────────────────────────────────────────────────────────────────

// stubAdminRepo is an in-memory admin repository for tests.
type stubAdminRepo struct {
	byEmail map[string]*adminmodel.Admin
}

func newStubAdminRepo(email, password string) *stubAdminRepo {
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	return &stubAdminRepo{
		byEmail: map[string]*adminmodel.Admin{
			email: {
				ID:           "admin-test-id",
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
	a, ok := r.byEmail[email]
	if !ok {
		return nil, &stubNotFound{}
	}
	return a, nil
}
func (r *stubAdminRepo) Update(_ context.Context, _ *adminmodel.Admin) error { return nil }
func (r *stubAdminRepo) List(_ context.Context, _, _ int) ([]*adminmodel.Admin, int64, error) {
	return nil, 0, nil
}
func (r *stubAdminRepo) Count(_ context.Context) (int64, error) { return int64(len(r.byEmail)), nil }

type stubNotFound struct{}

func (e *stubNotFound) Error() string { return "not found" }

type stubProductSvc struct {
	products []*model.Product
}

func (s *stubProductSvc) Create(_ context.Context, in model.CreateProductInput) (*model.Product, error) {
	p := &model.Product{
		ID:               "prod-1",
		Name:             in.Name,
		Currency:         in.Currency,
		PrincipalMinCents: in.PrincipalMinCents,
		PrincipalMaxCents: in.PrincipalMaxCents,
		AnnualInterestBps: in.AnnualInterestBps,
		OriginationFeeBps: in.OriginationFeeBps,
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	}
	s.products = append(s.products, p)
	return p, nil
}
func (s *stubProductSvc) GetByID(_ context.Context, id string) (*model.Product, error) {
	for _, p := range s.products {
		if p.ID == id {
			return p, nil
		}
	}
	return nil, &notFoundErr{id}
}
func (s *stubProductSvc) List(_ context.Context, _ bool) ([]*model.Product, error) {
	return s.products, nil
}
func (s *stubProductSvc) Update(_ context.Context, id string, in model.UpdateProductInput) (*model.Product, error) {
	p, err := s.GetByID(context.Background(), id)
	if err != nil {
		return nil, err
	}
	if in.Name != nil {
		p.Name = *in.Name
	}
	return p, nil
}
func (s *stubProductSvc) Archive(_ context.Context, id string) (*model.Product, error) {
	p, err := s.GetByID(context.Background(), id)
	if err != nil {
		return nil, err
	}
	p.Archived = true
	return p, nil
}
func (s *stubProductSvc) Unarchive(_ context.Context, id string) (*model.Product, error) {
	p, err := s.GetByID(context.Background(), id)
	if err != nil {
		return nil, err
	}
	p.Archived = false
	return p, nil
}

type notFoundErr struct{ id string }

func (e *notFoundErr) Error() string { return "not found: " + e.id }

// ─────────────────────────────────────────────────────────────────────────────
// Router builder
// ─────────────────────────────────────────────────────────────────────────────

func buildRouter(t *testing.T) (http.Handler, func() string) {
	t.Helper()

	as := authsvc.New("test-secret-integration", nil, newStubAdminRepo("admin@test.com", "adminpass"))
	requireAuth := apimw.RequireAuth(as)
	requireAdmin := apimw.RequireAdmin
	productSvc := &stubProductSvc{}
	productH := productsapi.NewHandler(productSvc)

	r := chi.NewRouter()
	r.Use(chimw.Recoverer)
	r.Use(apimw.CORS("*"))

	r.Route("/api/v1", func(r chi.Router) {
		authapi.Mount(r, authapi.NewHandler(as))

		r.Group(func(r chi.Router) {
			r.Use(requireAuth)
			r.Get("/products", productH.List)
			r.Get("/products/{id}", productH.Get)

			r.Group(func(r chi.Router) {
				r.Use(requireAdmin)
				r.Post("/products", productH.Create)
			})
		})
	})

	// Token minter – returns a fresh admin token.
	mintAdmin := func() string {
		sess, err := as.LoginAdmin(context.Background(), authmodel.LoginInput{
			Email: "admin@test.com", Password: "adminpass",
		})
		if err != nil {
			t.Fatalf("mint admin token: %v", err)
		}
		return sess.Token
	}

	return r, mintAdmin
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth endpoint tests
// ─────────────────────────────────────────────────────────────────────────────

func TestAdminLogin_Success(t *testing.T) {
	router, _ := buildRouter(t)

	body, _ := json.Marshal(map[string]string{
		"email":    "admin@test.com",
		"password": "adminpass",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/admin/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d – body: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("parse response: %v", err)
	}
	if resp.Token == "" {
		t.Fatal("expected non-empty token in response")
	}
}

func TestAdminLogin_BadCredentials(t *testing.T) {
	router, _ := buildRouter(t)

	body, _ := json.Marshal(map[string]string{
		"email":    "admin@test.com",
		"password": "wrongpass",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/admin/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", w.Code)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Protected endpoint tests
// ─────────────────────────────────────────────────────────────────────────────

func TestProducts_ListRequiresAuth(t *testing.T) {
	router, _ := buildRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/products", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", w.Code)
	}
}

func TestProducts_ListWithToken(t *testing.T) {
	router, mintAdmin := buildRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/products", nil)
	req.Header.Set("Authorization", "Bearer "+mintAdmin())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d – %s", w.Code, w.Body.String())
	}
}

func TestProducts_CreateRequiresAdmin(t *testing.T) {
	// Without any auth token → 401.
	router, _ := buildRouter(t)

	body, _ := json.Marshal(model.CreateProductInput{
		Name:              "Test Loan",
		Currency:          "USD",
		PrincipalMinCents: 100000,
		PrincipalMaxCents: 1000000,
		AnnualInterestBps: 1200,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/products", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401 without token, got %d", w.Code)
	}
}

func TestProducts_CreateWithAdminToken(t *testing.T) {
	router, mintAdmin := buildRouter(t)

	body, _ := json.Marshal(model.CreateProductInput{
		Name:              "Test Loan",
		Currency:          "USD",
		PrincipalMinCents: 100000,
		PrincipalMaxCents: 1000000,
		AnnualInterestBps: 1200,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/products", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+mintAdmin())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d – %s", w.Code, w.Body.String())
	}

	var created model.Product
	if err := json.NewDecoder(w.Body).Decode(&created); err != nil {
		t.Fatalf("decode created product: %v", err)
	}
	if created.ID == "" {
		t.Fatal("expected non-empty product ID")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// CORS header tests
// ─────────────────────────────────────────────────────────────────────────────

func TestCORS_HeadersPresent(t *testing.T) {
	router, mintAdmin := buildRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/products", nil)
	req.Header.Set("Authorization", "Bearer "+mintAdmin())
	req.Header.Set("Origin", "http://anything.example.com")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// The test router uses wildcard CORS, so ACAO must be "*".
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("expected ACAO=*, got %q", got)
	}
}

func TestCORS_Preflight(t *testing.T) {
	router, _ := buildRouter(t)

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/products", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set("Access-Control-Request-Method", "GET")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("want 204 on OPTIONS pre-flight, got %d", w.Code)
	}
}
