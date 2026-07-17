package blnksetup

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/blnk-demo/pay-recon/backend/internal/blnk"
	"github.com/blnk-demo/pay-recon/backend/internal/config"
	"github.com/blnk-demo/pay-recon/backend/internal/platform/blnkaccounts"
)

type systemBalanceDef struct {
	key       string
	indicator string
}

func Bootstrap(ctx context.Context, cfg config.Config, blnkCl *blnk.Client, repo *blnkaccounts.Repository) error {
	ledgerAcc, err := repo.GetByKey(ctx, blnkaccounts.KeyLedger)
	if err != nil {
		ledger, createErr := blnkCl.CreateLedger(ctx, blnk.CreateLedgerRequest{
			Name:     cfg.OrgName,
			MetaData: map[string]any{"org": cfg.OrgName},
		})
		if createErr != nil {
			return fmt.Errorf("create ledger: %w", createErr)
		}
		if err := repo.Upsert(ctx, &blnkaccounts.Account{
			Key:      blnkaccounts.KeyLedger,
			LedgerID: ledger.LedgerID,
		}); err != nil {
			return err
		}
		ledgerAcc = &blnkaccounts.Account{LedgerID: ledger.LedgerID}
		slog.Info("created blnk ledger", "name", cfg.OrgName, "id", ledger.LedgerID)
	}

	balances := []systemBalanceDef{
		{key: blnkaccounts.KeyOperating, indicator: "@OperatingAccount"},
		{key: blnkaccounts.KeyBankInflow, indicator: "@BankInflow"},
		{key: blnkaccounts.KeyAccountsPayable, indicator: "@AccountsPayable"},
		{key: blnkaccounts.KeyPurchaseExpense, indicator: "@PurchaseExpense"},
		{key: blnkaccounts.KeyTaxPayableWHT, indicator: "@TaxPayable-WHT"},
		{key: blnkaccounts.KeyFIRSRemittance, indicator: "@FIRS-Remittance"},
		{key: blnkaccounts.KeyLiabilityClearing, indicator: "@LiabilityClearing"},
	}

	for _, def := range balances {
		if _, err := repo.GetByKey(ctx, def.key); err == nil {
			continue
		}
		if err := repo.Upsert(ctx, &blnkaccounts.Account{
			Key:       def.key,
			LedgerID:  ledgerAcc.LedgerID,
			Indicator: def.indicator,
		}); err != nil {
			return err
		}
		slog.Info("registered blnk system balance indicator", "key", def.key, "indicator", def.indicator)
	}

	if err := ensureMerchantMatcherRule(ctx, blnkCl, repo); err != nil {
		return err
	}

	return nil
}

func ensureMerchantMatcherRule(ctx context.Context, blnkCl *blnk.Client, repo *blnkaccounts.Repository) error {
	if acc, err := repo.GetByKey(ctx, blnkaccounts.KeyMerchantMatcherRule); err == nil && acc.BlnkRuleID != "" {
		return nil
	}

	const ruleName = "Merchant net payment matcher"
	rules, err := blnkCl.ListMatchingRules(ctx)
	if err == nil {
		for _, r := range rules {
			if r.Name == ruleName {
				return repo.Upsert(ctx, &blnkaccounts.Account{
					Key:        blnkaccounts.KeyMerchantMatcherRule,
					BlnkRuleID: r.RuleID,
				})
			}
		}
	}

	rule, err := blnkCl.CreateMatchingRule(ctx, blnk.CreateMatchingRuleRequest{
		Name:        ruleName,
		Description: "Match merchant net payments by amount and reference",
		Criteria: []blnk.MatchingRuleCriteria{
			{Field: "amount", Operator: "equals"},
			{Field: "reference", Operator: "equals"},
		},
	})
	if err != nil {
		return fmt.Errorf("create matching rule: %w", err)
	}

	return repo.Upsert(ctx, &blnkaccounts.Account{
		Key:        blnkaccounts.KeyMerchantMatcherRule,
		BlnkRuleID: rule.RuleID,
	})
}

func OperatingIndicator(ctx context.Context, repo *blnkaccounts.Repository) (string, error) {
	return indicatorFor(ctx, repo, blnkaccounts.KeyOperating)
}

func BankInflowIndicator(ctx context.Context, repo *blnkaccounts.Repository) (string, error) {
	return indicatorFor(ctx, repo, blnkaccounts.KeyBankInflow)
}

func AccountsPayableIndicator(ctx context.Context, repo *blnkaccounts.Repository) (string, error) {
	return indicatorFor(ctx, repo, blnkaccounts.KeyAccountsPayable)
}

func PurchaseExpenseIndicator(ctx context.Context, repo *blnkaccounts.Repository) (string, error) {
	return indicatorFor(ctx, repo, blnkaccounts.KeyPurchaseExpense)
}

func indicatorFor(ctx context.Context, repo *blnkaccounts.Repository, key string) (string, error) {
	acc, err := repo.GetByKey(ctx, key)
	if err != nil {
		return "", err
	}
	return acc.Indicator, nil
}

func TaxPayableIndicator(ctx context.Context, repo *blnkaccounts.Repository) (string, error) {
	acc, err := repo.GetByKey(ctx, blnkaccounts.KeyTaxPayableWHT)
	if err != nil {
		return "", err
	}
	return acc.Indicator, nil
}

func FIRSRemittanceIndicator(ctx context.Context, repo *blnkaccounts.Repository) (string, error) {
	acc, err := repo.GetByKey(ctx, blnkaccounts.KeyFIRSRemittance)
	if err != nil {
		return "", err
	}
	return acc.Indicator, nil
}

func LiabilityClearingIndicator(ctx context.Context, repo *blnkaccounts.Repository) (string, error) {
	return indicatorFor(ctx, repo, blnkaccounts.KeyLiabilityClearing)
}

func LedgerID(ctx context.Context, repo *blnkaccounts.Repository) (string, error) {
	acc, err := repo.GetByKey(ctx, blnkaccounts.KeyLedger)
	if err != nil {
		return "", err
	}
	return acc.LedgerID, nil
}
