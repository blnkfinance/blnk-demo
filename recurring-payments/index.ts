import { blnk } from "@resources/utils.ts";
import { generateReference } from "@resources/generator.ts";

const PRECISION = 100;

/**
 * Recurring payments demo (StreamFlow): ledger setup, fund Marcus from @World,
 * schedule a single future charge to @Revenue. Matches the recurring payments
 * blog article flow.
 */
async function main() {
  try {
    console.log("🚀 Recurring Payments Demo (StreamFlow)\n");

    // --- Step 1: Ledger design ---
    console.log("Step 1: Setting up ledger design...");

    const ledgerRes = await blnk.post("/ledgers", {
      name: "Subscriptions Ledger",
      meta_data: {
        description: "Customer balances used for recurring billing",
      },
    });
    const ledgerId = ledgerRes.data.ledger_id;
    if (!ledgerId) throw new Error("Failed to create Subscriptions Ledger");
    console.log("Subscriptions Ledger created:", ledgerId);

    const identityRes = await blnk.post("/identities", {
      identity_type: "individual",
      first_name: "Marcus",
      last_name: "StreamFlow",
      email_address: "marcus@example.com",
      meta_data: {
        customer_id: "marcus",
        demo: "recurring-payments",
      },
    });
    const identityId = identityRes.data.identity_id;
    if (!identityId) throw new Error("Failed to create identity for Marcus");
    console.log("Identity created (Marcus):", identityId);

    const balanceRes = await blnk.post("/balances", {
      ledger_id: ledgerId,
      identity_id: identityId,
      currency: "USD",
      meta_data: {
        account_type: "subscription",
        customer_id: "marcus",
      },
    });
    const marcusBalanceId = balanceRes.data.balance_id;
    if (!marcusBalanceId) throw new Error("Failed to create balance for Marcus");
    console.log("Marcus balance created:", marcusBalanceId);
    console.log("");

    // --- Step 2: Fund the customer's balance ---
    console.log("Step 2: Funding Marcus's balance from @World...");

    const fundAmount = 20; // $20
    await blnk.post("/transactions", {
      amount: fundAmount,
      precision: PRECISION,
      currency: "USD",
      reference: "fund_marcus_001",
      source: "@World",
      destination: marcusBalanceId,
      description: "Initial funding for Marcus – subscription balance",
      allow_overdraft: true,
      skip_queue: true,
      meta_data: {
        transaction_type: "customer_funding",
        customer_id: "marcus",
      },
    });
    console.log(`Marcus funded with $${fundAmount}.00 (source: @World)`);

    let balance = await getBalance(marcusBalanceId);
    console.log(`Marcus balance after funding: $${balance.toFixed(2)}\n`);

    // --- Step 3: Schedule a single future charge ---
    console.log("Step 3: Scheduling a single future charge to @Revenue...");

    const chargeAmount = 10; // $10
    const scheduleDelayMs = 4 * 60 * 1000; // 4 minutes from now
    const scheduledFor = new Date(Date.now() + scheduleDelayMs);
    const scheduledForISO = scheduledFor.toISOString().replace(/\.\d{3}Z$/, "+00:00");

    const scheduleRes = await blnk.post("/transactions", {
      amount: chargeAmount,
      precision: PRECISION,
      currency: "USD",
      reference: "sub_abc123_2026-03",
      source: marcusBalanceId,
      destination: "@Revenue",
      description: "Monthly subscription – March 2026",
      scheduled_for: scheduledForISO,
      meta_data: {
        subscription_id: "sub_abc123",
        period: "2026-03",
        transaction_type: "recurring_charge",
      },
    });

    const txnId = scheduleRes.data.transaction_id;
    const status = scheduleRes.data.status;
    console.log("Scheduled charge created:", txnId);
    console.log("Status:", status);
    console.log("Scheduled for:", scheduledForISO);
    console.log(
      "When this time is reached, Blnk will apply the charge and send a transaction.applied webhook.\n",
    );

    // Optional: wait for scheduled time and show balance (adds ~4+ minutes to run time)
    const waitForApply = process.env.RECURRING_WAIT_FOR_APPLY === "true";
    if (waitForApply) {
      const waitMs = scheduleDelayMs + 10 * 1000; // 4 min + 10s buffer so Blnk has time to apply
      console.log(`Waiting ${Math.round(waitMs / 1000)}s for scheduled charge to apply...`);
      await sleep(waitMs);
      balance = await getBalance(marcusBalanceId);
      console.log(`Marcus balance after charge applied: $${balance.toFixed(2)}`);
    } else {
      console.log("💡 Tip: Set RECURRING_WAIT_FOR_APPLY=true to wait for the charge to apply and see the balance update.");
    }

    console.log("\n💡 Demo complete. See README for cancellation (reversal) and fetching balance.");
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error("❌ Error running recurring-payments demo:", err);
    if (err.response) console.error("Response:", JSON.stringify(err.response.data, null, 2));
    if (err.message) console.error("Message:", err.message);
    throw error;
  }
}

async function getBalance(balanceId: string): Promise<number> {
  const res = await blnk.get(`/balances/${balanceId}`);
  const raw = res.data.balance ?? 0;
  return raw / PRECISION;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
