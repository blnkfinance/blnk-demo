package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

// RateLimit returns a middleware that limits requests to maxRequests per window
// per IP address. Excess requests receive 429. The key prefix distinguishes
// different rate-limit zones (e.g. "login", "apply").
//
// Implementation: a Redis counter with a TTL equal to the window duration.
// If Redis is unavailable the request is allowed through (fail-open) so a
// Redis outage does not take down the API.
func RateLimit(rdb *goredis.Client, prefix string, maxRequests int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := realIP(r)
			key := fmt.Sprintf("rl:%s:%s", prefix, ip)

			ctx, cancel := context.WithTimeout(r.Context(), 200*time.Millisecond)
			defer cancel()

			count, err := rdb.Incr(ctx, key).Result()
			if err != nil {
				// Fail-open: allow the request through if Redis is unreachable.
				next.ServeHTTP(w, r)
				return
			}

			// Set expiry on first request in the window.
			if count == 1 {
				_ = rdb.Expire(ctx, key, window).Err()
			}

			if count > int64(maxRequests) {
				w.Header().Set("Retry-After", fmt.Sprintf("%.0f", window.Seconds()))
				writeErr(w, http.StatusTooManyRequests, "rate_limit_exceeded")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// realIP extracts the client IP address. It respects X-Real-IP and
// X-Forwarded-For headers set by a reverse proxy.
func realIP(r *http.Request) string {
	if v := r.Header.Get("X-Real-IP"); v != "" {
		return v
	}
	if v := r.Header.Get("X-Forwarded-For"); v != "" {
		// X-Forwarded-For may contain a comma-separated list; take the first.
		for i := range v {
			if v[i] == ',' {
				return v[:i]
			}
		}
		return v
	}
	// Fall back to RemoteAddr (strips port).
	host := r.RemoteAddr
	for i := len(host) - 1; i >= 0; i-- {
		if host[i] == ':' {
			return host[:i]
		}
	}
	return host
}
