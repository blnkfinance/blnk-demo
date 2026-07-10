package id

import (
	"crypto/rand"
	"encoding/hex"
)

// New returns a random 16-byte hex string suitable for use as a database ID.
func New() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// Ref builds a deterministic Blnk transaction reference from components.
// Blnk uses the reference for idempotency: posting the same reference twice
// is a no-op rather than a duplicate posting.
func Ref(parts ...string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += ":"
		}
		out += p
	}
	return out
}
