// Command seed_blnk provisions the Blnk ledger and system balances (Section 2).
// Run: go run ./scripts/seed_blnk.go
package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/blnk-demo/pay-recon/backend/internal/blnk"
	"github.com/blnk-demo/pay-recon/backend/internal/config"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnkaccounts"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnksetup"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/postgres"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("load config", "error", err)
		os.Exit(1)
	}

	pg, err := postgres.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("postgres connect", "error", err)
		os.Exit(1)
	}
	defer pg.Close()

	if err := postgres.Migrate(ctx, pg); err != nil {
		slog.Error("migrate", "error", err)
		os.Exit(1)
	}

	blnkCl := blnk.NewClient(cfg.BlnkBaseURL, cfg.BlnkAPIKey)
	accountsRepo := blnkaccounts.NewRepository(pg.Pool)

	if err := blnksetup.Bootstrap(ctx, cfg, blnkCl, accountsRepo); err != nil {
		slog.Error("blnk bootstrap failed", "error", err)
		os.Exit(1)
	}

	keys := []string{
		blnkaccounts.KeyLedger,
		blnkaccounts.KeyOperating,
		blnkaccounts.KeyBankInflow,
		blnkaccounts.KeyAccountsPayable,
		blnkaccounts.KeyPurchaseExpense,
		blnkaccounts.KeyTaxPayableWHT,
		blnkaccounts.KeyFIRSRemittance,
		blnkaccounts.KeyLiabilityClearing,
		blnkaccounts.KeyMerchantMatcherRule,
	}
	for _, key := range keys {
		acc, err := accountsRepo.GetByKey(ctx, key)
		if err != nil {
			slog.Error("missing account", "key", key, "error", err)
			os.Exit(1)
		}
		slog.Info("blnk account ready", "key", key, "ledger_id", acc.LedgerID, "balance_id", acc.BlnkBalanceID, "rule_id", acc.BlnkRuleID, "indicator", acc.Indicator)
	}

	slog.Info("blnk seed complete")
}
