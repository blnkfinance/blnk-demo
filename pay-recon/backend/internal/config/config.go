package config

import (
	"errors"
	"os"
	"strings"
	"time"
)

type Config struct {
	Environment      string
	Port             string
	DatabaseURL      string
	BlnkBaseURL      string
	BlnkAPIKey       string
	OrgName          string
	DefaultCurrency  string
	AdminFrontendURL string
	AuthSecret       string
	ShutdownTimeout  time.Duration
}

func Load() (Config, error) {
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		databaseURL = getenv("POSTGRES_DSN", "postgres://payrecon:payrecon@localhost:5432/pay_recon?sslmode=disable")
	}

	cfg := Config{
		Environment:      getenv("APP_ENV", "development"),
		Port:             getenv("PORT", "8090"),
		DatabaseURL:      databaseURL,
		BlnkBaseURL:      strings.TrimRight(os.Getenv("BLNK_BASE_URL"), "/"),
		BlnkAPIKey:       os.Getenv("BLNK_API_KEY"),
		OrgName:          getenv("ORG_NAME", "IBEDC-Operations"),
		DefaultCurrency:  strings.ToUpper(getenv("DEFAULT_CURRENCY", "NGN")),
		AdminFrontendURL: getenv("ADMIN_FRONTEND_URL", "http://localhost:8000"),
		AuthSecret:       getenv("AUTH_SECRET", "change-me-in-production"),
		ShutdownTimeout:  10 * time.Second,
	}

	if cfg.BlnkBaseURL == "" {
		return Config{}, errors.New("BLNK_BASE_URL is required")
	}
	if cfg.BlnkAPIKey == "" {
		return Config{}, errors.New("BLNK_API_KEY is required")
	}

	if cfg.Environment == "production" && cfg.AuthSecret == "change-me-in-production" {
		return Config{}, errors.New("AUTH_SECRET must be set to a random secret in production")
	}

	return cfg, nil
}

func getenv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
