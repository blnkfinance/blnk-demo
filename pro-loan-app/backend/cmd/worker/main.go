package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/config"
	loansrepo "github.com/blnk-demo/pro-loan-app/backend/internal/loans/repository"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/mongo"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/redis"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("load config", "error", err)
		os.Exit(1)
	}

	mongoClient, err := mongo.Connect(ctx, cfg.MongoURI)
	if err != nil {
		slog.Error("connect mongo", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := mongoClient.Disconnect(context.Background()); err != nil {
			slog.Error("disconnect mongo", "error", err)
		}
	}()

	redisClient := redis.Connect(cfg.RedisAddr, cfg.RedisPassword)
	defer redisClient.Close()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		slog.Error("connect redis", "error", err)
		os.Exit(1)
	}

	db := mongoClient.Database(cfg.MongoDatabase)

	loanRepo, err := loansrepo.NewMongo(ctx, db.Collection("loans"))
	if err != nil {
		slog.Error("init loan repo", "error", err)
		os.Exit(1)
	}

	slog.Info("worker started", "environment", cfg.Environment)

	// Run jobs immediately on startup, then on a daily ticker.
	runDailyJobs(ctx, loanRepo)

	midnight := nextMidnight()
	timer := time.NewTimer(time.Until(midnight))
	defer timer.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.Info("worker stopping")
			return
		case t := <-timer.C:
			slog.Info("running daily jobs", "at", t.UTC().Format(time.RFC3339))
			runDailyJobs(ctx, loanRepo)
			// Reset to next midnight.
			timer.Reset(time.Until(nextMidnight()))
		}
	}
}

func runDailyJobs(ctx context.Context, loanRepo interface {
	MarkDueLines(ctx context.Context) (int64, error)
	MarkOverdueLines(ctx context.Context) (int64, error)
}) {
	due, err := loanRepo.MarkDueLines(ctx)
	if err != nil {
		slog.Error("mark due lines", "error", err)
	} else if due > 0 {
		slog.Info("marked schedule lines as due", "count", due)
	}

	overdue, err := loanRepo.MarkOverdueLines(ctx)
	if err != nil {
		slog.Error("mark overdue lines", "error", err)
	} else if overdue > 0 {
		slog.Info("marked schedule lines as overdue", "count", overdue)
	}
}

// nextMidnight returns the next UTC midnight.
func nextMidnight() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
}
