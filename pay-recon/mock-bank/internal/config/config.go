package config

import (
	"os"
	"strings"
	"time"
)

type Config struct {
	Environment     string
	Port            string
	PostgresDSN     string
	ShutdownTimeout time.Duration
}

func Load() Config {
	return Config{
		Environment:     getenv("APP_ENV", "development"),
		Port:            getenv("PORT", "8081"),
		PostgresDSN:     getenv("POSTGRES_DSN", "postgres://mockbank:mockbank@localhost:5433/mock_bank?sslmode=disable"),
		ShutdownTimeout: 10 * time.Second,
	}
}

func getenv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
