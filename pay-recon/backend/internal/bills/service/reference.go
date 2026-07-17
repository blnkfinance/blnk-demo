package service

import (
	"context"
	"fmt"
	"time"
)

// generateBillReference returns a unique payment reference: PR-YYYYMMDD-NNNN (max 20 chars).
func (s *Service) generateBillReference(ctx context.Context) (string, error) {
	day := time.Now().UTC()
	for attempt := 0; attempt < 5; attempt++ {
		seq, err := s.repo.NextReferenceSeq(ctx, day)
		if err != nil {
			return "", err
		}
		ref := fmt.Sprintf("PR-%s-%04d", day.Format("20060102"), seq)
		existing, err := s.repo.GetByReference(ctx, ref)
		if err != nil || existing == nil {
			return ref, nil
		}
	}
	return "", fmt.Errorf("could not allocate bill_reference")
}
