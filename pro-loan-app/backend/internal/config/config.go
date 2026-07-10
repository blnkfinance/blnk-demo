package config

import (
	"errors"
	"log/slog"
	"os"
	"strings"
	"time"
)

type Config struct {
	Environment         string
	Port                string
	MongoURI            string
	MongoDatabase       string
	RedisAddr           string
	RedisPassword       string
	BlnkBaseURL         string
	BlnkAPIKey          string
	BlnkWebhookSecret   string
	AdminFrontendURL    string
	CustomerFrontendURL string
	AuthSecret          string
	ShutdownTimeout     time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		Environment:         getenv("APP_ENV", "development"),
		Port:                getenv("PORT", "8080"),
		MongoURI:            getenv("MONGO_URI", "mongodb://mongo:27017"),
		MongoDatabase:       getenv("MONGO_DATABASE", "pro_loan_app"),
		RedisAddr:           getenv("REDIS_ADDR", "redis:6379"),
		RedisPassword:       os.Getenv("REDIS_PASSWORD"),
		BlnkBaseURL:         strings.TrimRight(os.Getenv("BLNK_BASE_URL"), "/"),
		BlnkAPIKey:          os.Getenv("BLNK_API_KEY"),
		BlnkWebhookSecret:   os.Getenv("BLNK_WEBHOOK_SECRET"),
		AdminFrontendURL:    getenv("ADMIN_FRONTEND_URL", "http://localhost:3000"),
		CustomerFrontendURL: getenv("CUSTOMER_FRONTEND_URL", "http://localhost:3001"),
		AuthSecret:          getenv("AUTH_SECRET", "change-me-in-production"),
		ShutdownTimeout:     10 * time.Second,
	}

	if cfg.BlnkBaseURL == "" {
		return Config{}, errors.New("BLNK_BASE_URL is required")
	}
	if cfg.BlnkAPIKey == "" {
		return Config{}, errors.New("BLNK_API_KEY is required")
	}

	if cfg.Environment == "production" {
		if cfg.AuthSecret == "change-me-in-production" {
			return Config{}, errors.New("AUTH_SECRET must be set to a random secret in production")
		}
		if cfg.BlnkWebhookSecret == "" {
			slog.Warn("BLNK_WEBHOOK_SECRET is not set — webhook signatures will not be verified")
		}
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
