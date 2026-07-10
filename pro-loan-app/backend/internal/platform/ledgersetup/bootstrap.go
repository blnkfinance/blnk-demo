// Package ledgersetup creates the required Blnk ledgers on the first boot and
// persists their IDs so subsequent restarts reuse the same objects. Platform
// pool balances use General Ledger @ indicators and are created by Blnk on
// first transaction.
package ledgersetup

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/blnk-demo/pro-loan-app/backend/internal/blnk"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/settings"
)

// Bootstrap ensures customer ledgers and the platform identity exist in Blnk.
// It is safe to call on every startup; already-provisioned resources are
// skipped because their IDs are stored in the settings document.
func Bootstrap(ctx context.Context, blnkCl *blnk.Client, repo *settings.Repository) (*settings.PlatformSettings, error) {
	s, err := repo.Get(ctx)
	if err != nil {
		return nil, err
	}

	changed := false

	ledgerDefs := []struct {
		name    string
		meta    map[string]any
		setter  func(string)
		getter  func() string
		errWrap string
	}{
		{
			name:    "Customer Lending Ledger",
			meta:    map[string]any{"type": "receivable"},
			setter:  func(id string) { s.ReceivableLedgerID = id },
			getter:  func() string { return s.ReceivableLedgerID },
			errWrap: "create receivable ledger",
		},
		{
			name:    "Customer Wallet Ledger",
			meta:    map[string]any{"type": "wallet"},
			setter:  func(id string) { s.WalletLedgerID = id },
			getter:  func() string { return s.WalletLedgerID },
			errWrap: "create wallet ledger",
		},
	}

	for _, def := range ledgerDefs {
		if def.getter() != "" {
			continue
		}
		l, err := blnkCl.CreateLedger(ctx, blnk.CreateLedgerRequest{
			Name:     def.name,
			MetaData: def.meta,
		})
		if err != nil {
			return nil, fmt.Errorf("%s: %w", def.errWrap, err)
		}
		def.setter(l.LedgerID)
		slog.Info("created blnk ledger", "name", def.name, "id", l.LedgerID)
		changed = true
	}

	if err := EnsurePlatformIdentity(ctx, blnkCl, repo, s); err != nil {
		return nil, err
	}

	if changed {
		if err := repo.Save(ctx, s); err != nil {
			return nil, err
		}
	}

	return s, nil
}
