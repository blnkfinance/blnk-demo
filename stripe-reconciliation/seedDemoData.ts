import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Stripe from "stripe";

export type MismatchScenario = "missing_ledger" | "wrong_reference" | "wrong_amount";

export interface SeedConfig {
    depositCount: number;
    currency: string;
    mismatchScenarios: MismatchScenario[];
    outputDir: string;
    identityFirstName: string;
    identityLastName: string;
}

export interface SeedRecord {
    paymentIntentId: string;
    chargeId: string;
    balanceTransactionId: string;
    grossMinor: number;
    feeMinor: number;
    netMinor: number;
    currency: string;
    settledAt: string;
    ledgerTransactionId?: string;
    ledgerReference?: string;
    ledgerAmount?: number;
    mismatchScenario?: MismatchScenario;
}

export interface SeedState {
    batchId: string;
    createdAt: string;
    currency: string;
    ledgerId: string;
    identityId: string;
    walletId: string;
    mismatchScenarios: MismatchScenario[];
    records: SeedRecord[];
}

function getStripeClient(): Stripe {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        throw new Error("STRIPE_SECRET_KEY is required for seed. Add it to stripe-reconciliation/.env.");
    }
    return new Stripe(stripeSecretKey);
}

async function getBlnkClient() {
    const resources = await import("@resources/utils.ts");
    return resources.blnk;
}

function centsToMajor(amountMinor: number): number {
    return Number((amountMinor / 100).toFixed(2));
}

function isoSecondPrecision(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toISOString().replace(".000Z", "Z");
}

function buildAmountMinor(index: number): number {
    const base = 1800;
    const step = 275;
    return base + index * step;
}

async function ensureOutputDir(outputDir: string): Promise<string> {
    const absoluteOutputDir = resolve(outputDir);
    await mkdir(absoluteOutputDir, { recursive: true });
    return absoluteOutputDir;
}

function mismatchForRecord(index: number, scenarios: MismatchScenario[]): MismatchScenario | undefined {
    return scenarios[index];
}

async function sleep(ms: number): Promise<void> {
    await new Promise((resolveSleep) => {
        setTimeout(resolveSleep, ms);
    });
}

async function getChargeWithBalanceTransaction(
    stripe: Stripe,
    paymentIntentId: string,
): Promise<{ charge: Stripe.Charge; balanceTransaction: Stripe.BalanceTransaction }> {
    const maxAttempts = 6;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ["latest_charge.balance_transaction"],
        });

        if (!paymentIntent.latest_charge) {
            if (attempt === maxAttempts) {
                throw new Error(`No charge was created for payment intent ${paymentIntent.id}.`);
            }
            await sleep(attempt * 1200);
            continue;
        }

        const charge = typeof paymentIntent.latest_charge === "string"
            ? await stripe.charges.retrieve(paymentIntent.latest_charge, {
                expand: ["balance_transaction"],
            })
            : paymentIntent.latest_charge;

        if (charge.balance_transaction) {
            const balanceTransaction = typeof charge.balance_transaction === "string"
                ? await stripe.balanceTransactions.retrieve(charge.balance_transaction)
                : charge.balance_transaction;

            return { charge, balanceTransaction };
        }

        if (attempt === maxAttempts) {
            throw new Error(
                `Charge ${charge.id} has no balance transaction after retries. ` +
                `Payment intent status: ${paymentIntent.status}.`,
            );
        }

        await sleep(attempt * 1200);
    }

    throw new Error(`Could not resolve balance transaction for payment intent ${paymentIntentId}.`);
}

async function persistState(state: SeedState, outputDir: string): Promise<string> {
    const absoluteOutputDir = await ensureOutputDir(outputDir);
    const statePath = resolve(absoluteOutputDir, `${state.batchId}-state.json`);
    const latestStatePath = resolve(absoluteOutputDir, "latest-state.json");
    await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
    await writeFile(latestStatePath, JSON.stringify(state, null, 2), "utf8");
    return statePath;
}

export async function createDryRunState(config: SeedConfig): Promise<{ state: SeedState; statePath: string }> {
    const batchId = `stripe_recon_dry_${Date.now()}`;
    const currencyUpper = config.currency.toUpperCase();
    const nowSeconds = Math.floor(Date.now() / 1000);

    const records: SeedRecord[] = [];
    for (let index = 0; index < config.depositCount; index += 1) {
        const grossMinor = buildAmountMinor(index);
        const feeMinor = Math.max(50, Math.floor(grossMinor * 0.029) + 30);
        const netMinor = grossMinor - feeMinor;
        const mismatch = mismatchForRecord(index, config.mismatchScenarios);
        const paymentIntentId = `pi_dry_${batchId}_${String(index + 1).padStart(2, "0")}`;

        records.push({
            paymentIntentId,
            chargeId: `ch_dry_${batchId}_${index + 1}`,
            balanceTransactionId: `txn_dry_${batchId}_${index + 1}`,
            grossMinor,
            feeMinor,
            netMinor,
            currency: config.currency,
            settledAt: isoSecondPrecision(nowSeconds + index * 5),
            ledgerTransactionId: mismatch === "missing_ledger" ? undefined : `trn_dry_${batchId}_${index + 1}`,
            ledgerReference: mismatch === "missing_ledger"
                ? undefined
                : mismatch === "wrong_reference"
                ? `invalid_${paymentIntentId.slice(3)}`
                : paymentIntentId,
            ledgerAmount: mismatch === "missing_ledger"
                ? undefined
                : mismatch === "wrong_amount"
                ? centsToMajor(netMinor + 1)
                : centsToMajor(netMinor),
            mismatchScenario: mismatch,
        });
    }

    const state: SeedState = {
        batchId,
        createdAt: new Date().toISOString(),
        currency: currencyUpper,
        ledgerId: `ldg_dry_${batchId}`,
        identityId: `idt_dry_${batchId}`,
        walletId: `bal_dry_${batchId}`,
        mismatchScenarios: config.mismatchScenarios,
        records,
    };

    const statePath = await persistState(state, config.outputDir);
    return { state, statePath };
}

export async function seedDemoData(config: SeedConfig): Promise<{ state: SeedState; statePath: string }> {
    const stripe = getStripeClient();
    const blnk = await getBlnkClient();
    const batchId = `stripe_recon_${Date.now()}`;
    const currencyUpper = config.currency.toUpperCase();
    const absoluteOutputDir = await ensureOutputDir(config.outputDir);

    console.log(`Creating Blnk objects for batch: ${batchId}`);

    const ledgerResponse = await blnk.post("/ledgers", {
        name: `Stripe Reconciliation ${batchId}`,
        meta_data: {
            demo: "stripe-reconciliation",
            demo_batch_id: batchId,
        },
    });
    const ledgerId: string | undefined = ledgerResponse.data.ledger_id;
    if (!ledgerId) {
        throw new Error("Failed to create ledger for demo.");
    }

    const identityResponse = await blnk.post("/identities", {
        identity_type: "individual",
        first_name: config.identityFirstName,
        last_name: config.identityLastName,
        email_address: `${batchId}@example.com`,
        meta_data: {
            demo: "stripe-reconciliation",
            demo_batch_id: batchId,
        },
    });
    const identityId: string | undefined = identityResponse.data.identity_id;
    if (!identityId) {
        throw new Error("Failed to create identity for demo.");
    }

    const walletResponse = await blnk.post("/balances", {
        ledger_id: ledgerId,
        identity_id: identityId,
        currency: currencyUpper,
        meta_data: {
            wallet_type: "customer_wallet",
            demo: "stripe-reconciliation",
            demo_batch_id: batchId,
        },
    });
    const walletId: string | undefined = walletResponse.data.balance_id;
    if (!walletId) {
        throw new Error("Failed to create wallet balance for demo.");
    }

    const records: SeedRecord[] = [];
    for (let index = 0; index < config.depositCount; index += 1) {
        const amountMinor = buildAmountMinor(index);
        const mismatch = mismatchForRecord(index, config.mismatchScenarios);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountMinor,
            currency: config.currency,
            confirm: true,
            payment_method: "pm_card_visa",
            payment_method_types: ["card"],
            description: `Deposit ${index + 1} for ${batchId}`,
            metadata: {
                demo_batch_id: batchId,
                demo_type: "stripe-reconciliation",
                demo_index: String(index + 1),
            },
        });

        if (paymentIntent.status !== "succeeded") {
            throw new Error(`Payment intent ${paymentIntent.id} did not succeed. Status: ${paymentIntent.status}`);
        }

        const { charge, balanceTransaction } = await getChargeWithBalanceTransaction(stripe, paymentIntent.id);

        const netMinor = balanceTransaction.net;
        const ledgerAmountMajor = mismatch === "wrong_amount"
            ? centsToMajor(netMinor + 1)
            : centsToMajor(netMinor);
        const ledgerReference = mismatch === "wrong_reference"
            ? `invalid_${paymentIntent.id.slice(3)}`
            : paymentIntent.id;

        let ledgerTransactionId: string | undefined;
        if (mismatch !== "missing_ledger") {
            const transactionResponse = await blnk.post("/transactions", {
                amount: ledgerAmountMajor,
                precision: 100,
                currency: currencyUpper,
                source: `@World${currencyUpper}`,
                destination: walletId,
                reference: ledgerReference,
                description: `Stripe net settlement for ${paymentIntent.id}`,
                allow_overdraft: true,
                meta_data: {
                    provider: "stripe",
                    stripe_payment_intent_id: paymentIntent.id,
                    stripe_balance_transaction_id: balanceTransaction.id,
                    demo_batch_id: batchId,
                    mismatch_scenario: mismatch ?? null,
                },
            });
            ledgerTransactionId = transactionResponse.data.transaction_id;
        }

        records.push({
            paymentIntentId: paymentIntent.id,
            chargeId: charge.id,
            balanceTransactionId: balanceTransaction.id,
            grossMinor: balanceTransaction.amount,
            feeMinor: balanceTransaction.fee,
            netMinor,
            currency: balanceTransaction.currency,
            settledAt: isoSecondPrecision(balanceTransaction.created),
            ledgerTransactionId,
            ledgerReference: mismatch === "missing_ledger" ? undefined : ledgerReference,
            ledgerAmount: mismatch === "missing_ledger" ? undefined : ledgerAmountMajor,
            mismatchScenario: mismatch,
        });
    }

    const state: SeedState = {
        batchId,
        createdAt: new Date().toISOString(),
        currency: currencyUpper,
        ledgerId,
        identityId,
        walletId,
        mismatchScenarios: config.mismatchScenarios,
        records,
    };

    const statePath = await persistState(state, absoluteOutputDir);

    return { state, statePath };
}
