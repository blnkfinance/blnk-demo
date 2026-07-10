package id_test

import (
	"testing"

	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/id"
)

func TestNew_UniqueValues(t *testing.T) {
	seen := make(map[string]bool)
	for range 1000 {
		v := id.New()
		if v == "" {
			t.Fatal("id.New() returned empty string")
		}
		if seen[v] {
			t.Fatalf("id.New() returned duplicate value: %s", v)
		}
		seen[v] = true
	}
}

func TestNew_Length(t *testing.T) {
	v := id.New()
	if len(v) != 32 {
		t.Errorf("expected length 32, got %d: %s", len(v), v)
	}
}

func TestRef_Basic(t *testing.T) {
	ref := id.Ref("loan", "abc123", "disbursement")
	if ref != "loan:abc123:disbursement" {
		t.Errorf("unexpected ref: %s", ref)
	}
}

func TestRef_Single(t *testing.T) {
	ref := id.Ref("only")
	if ref != "only" {
		t.Errorf("unexpected ref: %s", ref)
	}
}
