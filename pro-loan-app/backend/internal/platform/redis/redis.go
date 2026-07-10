package redis

import goredis "github.com/redis/go-redis/v9"

type Client = *goredis.Client

func Connect(addr, password string) Client {
	return goredis.NewClient(&goredis.Options{
		Addr:     addr,
		Password: password,
		DB:       0,
	})
}
