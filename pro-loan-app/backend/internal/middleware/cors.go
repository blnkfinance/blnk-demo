package middleware

import (
	"net/http"
	"strings"
)

// CORS returns a middleware that sets the appropriate CORS headers.
// allowedOrigins is a list of permitted origins; pass "*" to allow all
// (only suitable for development).
func CORS(allowedOrigins ...string) func(http.Handler) http.Handler {
	originSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[strings.TrimRight(o, "/")] = true
	}
	allowAll := originSet["*"]

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			if allowAll {
				// Wildcard mode: send "*". Note that browsers disallow
				// Access-Control-Allow-Credentials with "*", so we omit it here.
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else if origin != "" && originSet[origin] {
				// Specific origin – echo it so credentials work correctly.
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Request-Id")
			w.Header().Set("Access-Control-Max-Age", "86400")

			// Handle pre-flight.
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
