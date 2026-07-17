package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Client struct {
	Pool *pgxpool.Pool
}

func Connect(ctx context.Context, dsn string) (*Client, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("postgres connect: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("postgres ping: %w", err)
	}
	return &Client{Pool: pool}, nil
}

func (c *Client) Close() {
	if c != nil && c.Pool != nil {
		c.Pool.Close()
	}
}
