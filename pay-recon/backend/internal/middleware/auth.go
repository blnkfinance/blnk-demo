package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/blnk-demo/pay-recon/backend/internal/auth"
	authmodel "github.com/blnk-demo/pay-recon/backend/internal/auth/model"
)

type contextKey string

const claimsKey contextKey = "auth_claims"

func ClaimsFromContext(ctx context.Context) *authmodel.Claims {
	v, _ := ctx.Value(claimsKey).(*authmodel.Claims)
	return v
}

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
