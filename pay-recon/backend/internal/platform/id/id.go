package id

import (
	"crypto/rand"
	"encoding/hex"
	"strings"
)

func New() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

func Ref(parts ...string) string {
	return strings.Join(parts, ":")
}
