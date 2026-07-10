package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/app"
	"github.com/blnk-demo/pro-loan-app/backend/internal/blnk"
	"github.com/blnk-demo/pro-loan-app/backend/internal/config"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/ledgersetup"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/mongo"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/settings"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("load config", "error", err)
		os.Exit(1)
	}

	server, cleanup, err := app.NewServer(ctx, cfg)
	if err != nil {
		slog.Error("create server", "error", err)
		os.Exit(1)
	}
	defer cleanup()

	// Bootstrap Blnk platform ledgers asynchronously so a temporarily
	// unreachable Blnk Cloud does not block the API from starting.
	go func() {
		bsCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		mongoClient, err := mongo.Connect(bsCtx, cfg.MongoURI)
		if err != nil {
			slog.Warn("ledger bootstrap: mongo connect failed", "error", err)
			return
		}
		defer func() { _ = mongoClient.Disconnect(context.Background()) }()

		settingsRepo := settings.NewRepository(mongoClient.Database(cfg.MongoDatabase).Collection("platform_settings"))
		blnkCl := blnk.NewClient(cfg.BlnkBaseURL, cfg.BlnkAPIKey)

		if _, err := ledgersetup.Bootstrap(bsCtx, blnkCl, settingsRepo); err != nil {
			slog.Warn("ledger bootstrap failed; loan disbursements will be unavailable until Blnk is reachable", "error", err)
		} else {
			slog.Info("blnk platform ledgers bootstrapped")
		}
	}()

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           server.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		slog.Info("api listening", "addr", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("api failed", "error", err)
			stop()
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("api shutdown failed", "error", err)
		os.Exit(1)
	}
}
