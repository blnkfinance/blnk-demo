package schedule_test

import (
	"testing"
	"time"

	"github.com/blnk-demo/pro-loan-app/backend/internal/loans/schedule"
)

func TestBuild_12MonthStandard(t *testing.T) {
	lines := schedule.Build(100_000, 1800, 12, time.Now().UTC())

	if len(lines) != 12 {
		t.Fatalf("expected 12 schedule lines, got %d", len(lines))
	}

	for i, l := range lines {
		if l.ID == "" {
			t.Errorf("line %d has empty ID", i)
		}
		if l.DueDate.IsZero() {
			t.Errorf("line %d has zero DueDate", i)
		}
		if l.PrincipalCents <= 0 {
			t.Errorf("line %d has non-positive principal: %d", i, l.PrincipalCents)
		}
		if l.InterestCents < 0 {
			t.Errorf("line %d has negative interest: %d", i, l.InterestCents)
		}
	}

	var totalPrincipal int64
	for _, l := range lines {
		totalPrincipal += l.PrincipalCents
	}
	if diff := totalPrincipal - 100_000; diff < -1 || diff > 1 {
		t.Errorf("total principal %d differs from loan amount 100000 by more than 1 cent", totalPrincipal)
	}
}

func TestBuild_ZeroInterest(t *testing.T) {
	lines := schedule.Build(60_000, 0, 6, time.Now().UTC())

	if len(lines) != 6 {
		t.Fatalf("expected 6 lines, got %d", len(lines))
	}

	for _, l := range lines {
		if l.InterestCents != 0 {
			t.Errorf("expected zero interest, got %d", l.InterestCents)
		}
	}
}

func TestBuild_NoScheduleFees(t *testing.T) {
	lines := schedule.Build(100_000, 0, 3, time.Now().UTC())

	for i, line := range lines {
		if line.FeeCents != 0 {
			t.Errorf("expected zero fee on line %d, got %d", i, line.FeeCents)
		}
	}
}

func TestBuild_ZeroTerms(t *testing.T) {
	lines := schedule.Build(100_000, 1800, 0, time.Now().UTC())
	if len(lines) != 0 {
		t.Errorf("expected 0 lines for zero term, got %d", len(lines))
	}
}

func TestBuild_DueDatesMonthlyIncrement(t *testing.T) {
	start := time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC)
	lines := schedule.Build(100_000, 1200, 3, start)

	expected := []time.Month{time.February, time.March, time.April}
	for i, l := range lines {
		if l.DueDate.Month() != expected[i] {
			t.Errorf("line %d: expected month %v, got %v", i, expected[i], l.DueDate.Month())
		}
	}
}
