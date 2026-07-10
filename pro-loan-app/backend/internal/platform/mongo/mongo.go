package mongo

import (
	"context"
	"time"

	driver "go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Client = driver.Client

func Connect(ctx context.Context, uri string) (*Client, error) {
	connectCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	return driver.Connect(connectCtx, options.Client().ApplyURI(uri))
}
