import { faker } from "@faker-js/faker";
import { blnk } from "@resources/utils.ts";
import { log } from "@resources/utils.ts";

interface Balance {
    id: string;
    currency: string;
}

interface OnboardingResult {
    balances: Balance[];
    errors: Array<{ type: string; message: string }>;
}

/**
 * Simulates the onboarding process by creating identities and their balances
 */
export async function simulateOnboarding(
    ledgerId: string,
    identitiesCount: number,
    balancesPerIdentity: string[]
): Promise<OnboardingResult> {
    try {
        log(`Starting onboarding simulation for ${identitiesCount} identities`, "info");

        const results: OnboardingResult = {
            balances: [],
            errors: [],
        };

        // Process each identity
        for (let i = 0; i < identitiesCount; i++) {
            try {
                // Generate identity data using faker
                const identityData = {
                    identity_type: "individual" as const,
                    first_name: faker.person.firstName(),
                    last_name: faker.person.lastName(),
                    email_address: faker.internet.email(),
                };

                // Create identity
                const identityResponse = await blnk.post("/identities", identityData);
                const identityId = identityResponse.data.identity_id;

                if (!identityId) {
                    throw new Error("identity_id is missing from response");
                }

                // Create balances for each currency
                for (const currency of balancesPerIdentity) {
                    try {
                        const balanceResponse = await blnk.post("/balances", {
                            ledger_id: ledgerId,
                            identity_id: identityId,
                            currency: currency,
                        });

                        const balanceId = balanceResponse.data.balance_id;
                        if (!balanceId) {
                            throw new Error("balance_id is missing from response");
                        }

                        results.balances.push({
                            id: balanceId,
                            currency: currency,
                        });
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

        // Summary
        log(`\nOnboarding simulation completed!`, "success");
        log(`Summary:`, "info");
        log(`  • Identities created: ${identitiesCount}`, "info");
        log(`  • Balances created: ${results.balances.length}`, "info");
        log(`  • Errors encountered: ${results.errors.length}`, results.errors.length > 0 ? "warning" : "info");

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
