package ledgersetup

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/blnk-demo/pro-loan-app/backend/internal/blnk"
	"github.com/blnk-demo/pro-loan-app/backend/internal/platform/settings"
)

const platformOrgName = "Pro Loan Platform"

// EnsurePlatformIdentity creates the organization identity used as owner for
// platform internal balances. Safe to call on every bootstrap.
func EnsurePlatformIdentity(ctx context.Context, blnkCl *blnk.Client, repo *settings.Repository, s *settings.PlatformSettings) error {
	if s.PlatformIdentityID != "" {
		return nil
	}

	ident, err := blnkCl.CreateIdentity(ctx, blnk.CreateIdentityRequest{
		IdentityType:     "organization",
		OrganizationName: platformOrgName,
		Category:         "platform",
		MetaData: map[string]any{
			"owner_type": "platform",
			"managed_by": "pro-loan-app",
		},
	})
	if err != nil {
		return fmt.Errorf("create platform identity: %w", err)
	}

	s.PlatformIdentityID = ident.IdentityID
	if err := repo.Save(ctx, s); err != nil {
		return fmt.Errorf("save platform identity: %w", err)
	}

	slog.Info("created blnk platform identity", "name", platformOrgName, "id", ident.IdentityID)
	return nil
}

// TryLinkPlatformIdentity assigns the platform org identity to an internal balance
// after Blnk auto-creates it from an @ indicator. No-op when already linked.
func TryLinkPlatformIdentity(ctx context.Context, blnkCl *blnk.Client, platformIdentityID, indicator string) {
	if platformIdentityID == "" || !strings.HasPrefix(indicator, "@") {
		return
	}

	currency := IndicatorCurrency(indicator)
	if currency == "" {
		return
	}

	bal, err := blnkCl.GetBalanceByIndicator(ctx, indicator, currency)
	if err != nil {
		return
	}
	if bal.IdentityID != "" {
		return
	}

	if _, err := blnkCl.UpdateBalanceIdentity(ctx, bal.BalanceID, platformIdentityID); err != nil {
		slog.Debug("link platform identity to internal balance", "indicator", indicator, "err", err)
		return
	}

	slog.Info("linked platform identity to internal balance", "indicator", indicator, "balance_id", bal.BalanceID)
}
