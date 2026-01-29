import { faker } from "@faker-js/faker";
import { blnk, log } from "./utils.ts";

/**
 * Populate demo onboarding.
 *
 * This module creates a realistic “customer universe”:
 * - One ledger per currency (keeps currency boundaries explicit and avoids FX confusion)
 * - Many identities (customers)
 * - One balance per identity per currency
 *
 * The output is a list of balance IDs that the transactions phase can use.
 */
interface Balance {
  id: string;
  currency: string;
}

export interface OnboardingResult {
  balances: Balance[];
  errors: Array<{ type: string; message: string }>;
}

/** Treat "Customers Ledger" and "Customers" as the same base name. */
function toLedgerBaseName(name: string): string {
  return name.replace(/\s*ledger\s*$/i, "").trim();
}

/** Build a human-friendly ledger name per currency. */
function ledgerNameForCurrency(baseName: string, currency: string): string {
  return `${baseName} ${currency} Ledger`;
}

/**
 * Normalize and dedupe currencies.
 *
 * We uppercase so "usd" and "USD" don't accidentally create two ledgers/balances.
 */
function normalizeCurrencies(currencies: string[]): string[] {
  return Array.from(
    new Set(
      currencies
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length > 0)
    )
  );
}

/**
 * Simulate onboarding by creating identities and their balances.
 *
 * This gives the populate demo a pool of real balance IDs so later we can post
 * transactions that look like customer-to-customer transfers.
 */
export async function simulateOnboarding(
  identitiesCount: number,
  balancesPerIdentity: string[]
): Promise<OnboardingResult> {
  try {
    log(`Starting onboarding simulation for ${identitiesCount} identities`, "info");

    const results: OnboardingResult = {
      balances: [],
      errors: [],
    };

    /**
     * Step 1: Create one ledger per currency.
     *
     * Blnk balances belong to a ledger. By splitting ledgers per currency we keep
     * a clean accounting boundary and remove the chance of “USD balance in EUR ledger”.
     */
    const currencies = normalizeCurrencies(balancesPerIdentity);
    const ledgerBaseName = "Customers";
    const ledgerIdsByCurrency: Record<string, string> = {};

    log(`\nCreating one ledger per currency...`, "info");
    for (const currency of currencies) {
      const name = ledgerNameForCurrency(ledgerBaseName, currency);
      log(`Creating ledger: ${name}`, "info");

      const ledgerResponse = await blnk.post("/ledgers", {
        name,
        meta_data: {
          currency,
          purpose: "populate-demo",
          description: `Ledger for ${currency} customer balances created by the populate demo`,
        },
      });

      const ledgerId = ledgerResponse.data.ledger_id;
      if (!ledgerId) {
        throw new Error(`ledger_id missing from response for ledger ${name}`);
      }

      ledgerIdsByCurrency[currency] = ledgerId;
      log(`✅ Ledger created: ${ledgerId}`, "success");
    }

    /**
     * Step 2: Create identities and balances.
     *
     * We create an identity, then immediately create its balances across all
     * requested currencies so each identity ends up with the same “shape”.
     */
    for (let i = 0; i < identitiesCount; i++) {
      try {
        const identityData = {
          identity_type: "individual" as const,
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          email_address: faker.internet.email(),
        };

        const identityResponse = await blnk.post("/identities", identityData);
        const identityId = identityResponse.data.identity_id;

        if (!identityId) {
          throw new Error("identity_id is missing from response");
        }

        for (const currency of currencies) {
          try {
            const ledgerId = ledgerIdsByCurrency[currency];
            if (!ledgerId) {
              throw new Error(`Missing ledger_id for currency ${currency}`);
            }

            // Each balance is created under the currency-specific ledger.
            const balanceResponse = await blnk.post("/balances", {
              ledger_id: ledgerId,
              identity_id: identityId,
              currency,
            });

            const balanceId = balanceResponse.data.balance_id;
            if (!balanceId) {
              throw new Error("balance_id is missing from response");
            }

            results.balances.push({ id: balanceId, currency });
          } catch (balanceError: any) {
            results.errors.push({
              type: "balance_creation",
              message: balanceError.message || String(balanceError),
            });
          }
        }
      } catch (identityError: any) {
        results.errors.push({
          type: "identity_creation",
          message: identityError.message || String(identityError),
        });
      }
    }

    log(`\nOnboarding simulation completed!`, "success");
    log(`Summary:`, "info");
    log(`  • Identities created: ${identitiesCount}`, "info");
    log(`  • Balances created: ${results.balances.length}`, "info");
    log(
      `  • Errors encountered: ${results.errors.length}`,
      results.errors.length > 0 ? "warning" : "info"
    );

    if (results.errors.length > 0) {
      log(`\nErrors encountered:`, "warning");
      results.errors.forEach((error, index) => {
        log(`  ${index + 1}. ${error.type}: ${error.message}`, "error");
      });
    }

    return results;
  } catch (error: any) {
    log(`Onboarding simulation failed: ${error.message}`, "error");
    throw error;
  }
}

