package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// Worker is intentionally a placeholder. Reconciliation runs inline in the API
// when a statement is uploaded (StartRun → ProcessRun). Keep this process for
// Compose parity / future scheduled jobs only.
func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	slog.Info("worker idle — reconciliation is handled inline by the API; no scheduled jobs configured")

	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			slog.Info("worker shutting down")
			return
		case <-ticker.C:
			slog.Info("worker heartbeat — still idle")
		}
	}
}
