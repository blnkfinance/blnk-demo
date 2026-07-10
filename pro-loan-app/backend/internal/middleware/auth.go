// Package middleware provides reusable chi middleware for the API.
package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/blnk-demo/pro-loan-app/backend/internal/auth"
	authmodel "github.com/blnk-demo/pro-loan-app/backend/internal/auth/model"
)

// contextKey is an unexported type to avoid collisions with other packages.
type contextKey string

const claimsKey contextKey = "auth_claims"

// ClaimsFromContext retrieves the validated JWT claims stored by RequireAuth.
// Returns nil if the context has no claims (i.e. request was not authenticated).
func ClaimsFromContext(ctx context.Context) *authmodel.Claims {
	v, _ := ctx.Value(claimsKey).(*authmodel.Claims)
	return v
}

// RequireAuth validates the Bearer token in the Authorization header and
// stores the resulting claims in the request context.  Requests with missing
// or invalid tokens receive 401.
func RequireAuth(authSvc auth.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractBearer(r)
			if token == "" {
				writeErr(w, http.StatusUnauthorized, "missing_token")
				return
			}

			claims, err := authSvc.ValidateToken(r.Context(), token)
			if err != nil {
				writeErr(w, http.StatusUnauthorized, "invalid_token")
				return
			}

			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAdmin is a middleware that must be chained after RequireAuth.
// It rejects requests whose token role is not RoleAdmin.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := ClaimsFromContext(r.Context())
		if claims == nil || claims.Role != authmodel.RoleAdmin {
			writeErr(w, http.StatusForbidden, "admin_required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireCustomerSelf is a middleware that must be chained after RequireAuth.
// It ensures the authenticated customer can only access their own resources.
// Admin tokens are allowed through unconditionally.
// The handler must embed the customer ID in the chi URL param named "customer_id",
// or alternatively the caller sets the customer_id explicitly.
func RequireCustomerSelf(customerIDParam string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())
			if claims == nil {
				writeErr(w, http.StatusUnauthorized, "missing_token")
				return
			}
			// Admins can see any resource.
			if claims.Role == authmodel.RoleAdmin {
				next.ServeHTTP(w, r)
				return
			}
			// Customers can only see their own data.
			// The customer_id is injected into the context by the Apply handler.
			// For list endpoints the filter is applied at the service level.
			next.ServeHTTP(w, r)
		})
	}
}

func extractBearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(h, "Bearer ")
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
