// Package main migrates MongoDB documents after schema changes.
package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/config"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/mongo"
	"go.mongodb.org/mongo-driver/bson"
	driver "go.mongodb.org/mongo-driver/mongo"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("load config", "error", err)
		os.Exit(1)
	}

	mc, err := mongo.Connect(ctx, cfg.MongoURI)
	if err != nil {
		slog.Error("connect mongo", "error", err)
		os.Exit(1)
	}
	defer func() { _ = mc.Disconnect(context.Background()) }()

	db := mc.Database(cfg.MongoDatabase)
	if err := migrateWalletBalanceAfter(ctx, db.Collection("wallet_transactions")); err != nil {
		slog.Error("migrate wallet_transactions", "error", err)
		os.Exit(1)
	}

	slog.Info("migration complete")
}

func migrateWalletBalanceAfter(ctx context.Context, coll *driver.Collection) error {
	filter := bson.M{
		"balance_after": bson.M{"$exists": true},
		"$or": []bson.M{
			{"balance_after": bson.M{"$type": "int"}},
			{"balance_after": bson.M{"$type": "long"}},
		},
	}

	cursor, err := coll.Find(ctx, filter)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var updated int
	for cursor.Next(ctx) {
		var doc struct {
			ID           string `bson:"_id"`
			BalanceAfter int64  `bson:"balance_after"`
		}
		if err := cursor.Decode(&doc); err != nil {
			return err
		}
		_, err := coll.UpdateByID(ctx, doc.ID, bson.M{
			"$set": bson.M{"balance_after": float64(doc.BalanceAfter)},
		})
		if err != nil {
			return err
		}
		updated++
	}
	if err := cursor.Err(); err != nil {
		return err
	}

	slog.Info("wallet_transactions balance_after migrated", "count", updated)
	return nil
}
