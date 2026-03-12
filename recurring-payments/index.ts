import { blnk } from "@resources/utils.ts";

const PRECISION = 100;

/**
 * Savings goal demo (Kite): Mia sets a savings goal of $200/month for 3 months.
 * All three deposits are scheduled upfront in a single bulk request.
 * Matches the savings goal article flow.
 */
async function main() {
  try {
    console.log("🚀 Savings Goal Demo (Kite)\n");

    // --- Step 1: Setting up ledger design ---
    console.log("Step 1: Creating Savings Ledger, identity, and Mia's savings balance...");

    const ledgerRes = await blnk.post("/ledgers", {
      name: "Savings Ledger",
      meta_data: {
        description: "Contains all customer savings balances for the savings-goal demo",
        demo: "savings-goal",
      },
    });
    const savingsLedgerId = ledgerRes.data.ledger_id;
    if (!savingsLedgerId) {
      throw new Error("Failed to create Savings Ledger");
    }
    console.log("Savings Ledger created:", savingsLedgerId);

    const identityRes = await blnk.post("/identities", {
      identity_type: "individual",
      first_name: "Mia",
      last_name: "Kite",
      email_address: "mia@example.com",
      meta_data: {
        customer_id: "mia",
        demo: "savings-goal",
      },
    });
    const identityId = identityRes.data.identity_id;
    if (!identityId) {
      throw new Error("Failed to create identity for Mia");
    }
    console.log("Identity created (Mia):", identityId);

    const savingsBalanceRes = await blnk.post("/balances", {
      ledger_id: savingsLedgerId,
      identity_id: identityId,
      currency: "USD",
      meta_data: {
        account_type: "savings",
        customer_id: "mia",
      },
    });
    const miaSavingsBalanceId = savingsBalanceRes.data.balance_id;
    if (!miaSavingsBalanceId) {
      throw new Error("Failed to create savings balance for Mia");
    }
    console.log("Mia's savings balance created:", miaSavingsBalanceId);
    console.log("");

    // --- Step 2: Activating a savings goal (3 deposits scheduled at once) ---
    console.log("Step 2: Scheduling Mia's savings goal deposits ($200/month × 3 months)...");

    const depositAmount = 20000; // $200 with precision 100
    const goalId = "goal_mia_001";

    // Schedule deposits 2 minutes apart for demo visibility
    const now = new Date();
    const firstRun = new Date(now.getTime() + 2 * 60 * 1000); // +2 minutes
    const secondRun = new Date(now.getTime() + 4 * 60 * 1000); // +4 minutes
    const thirdRun = new Date(now.getTime() + 6 * 60 * 1000); // +6 minutes

    const formatForBlnk = (d: Date) =>
      d.toISOString().replace(/\.\d{3}Z$/, "+00:00");

    const bulkRes = await blnk.post("/transactions/bulk", {
      atomic: true,
      inflight: false,
      run_async: false,
      transactions: [
        {
          amount: depositAmount,
          precision: PRECISION,
          currency: "USD",
          reference: "save_mia_2026-03",
          source: "@BankDeposits",
          destination: miaSavingsBalanceId,
          description: "Monthly savings deposit - March 2026",
          allow_overdraft: true,
          scheduled_for: formatForBlnk(firstRun),
          meta_data: {
            goal_id: goalId,
            period: "2026-03",
          },
        },
        {
          amount: depositAmount,
          precision: PRECISION,
          currency: "USD",
          reference: "save_mia_2026-04",
          source: "@BankDeposits",
          destination: miaSavingsBalanceId,
          description: "Monthly savings deposit - April 2026",
          allow_overdraft: true,
          scheduled_for: formatForBlnk(secondRun),
          meta_data: {
            goal_id: goalId,
            period: "2026-04",
          },
        },
        {
          amount: depositAmount,
          precision: PRECISION,
          currency: "USD",
          reference: "save_mia_2026-05",
          source: "@BankDeposits",
          destination: miaSavingsBalanceId,
          description: "Monthly savings deposit - May 2026",
          allow_overdraft: true,
          scheduled_for: formatForBlnk(thirdRun),
          meta_data: {
            goal_id: goalId,
            period: "2026-05",
          },
        },
      ],
    });

    console.log("Bulk savings schedule created:");
    console.log("Batch ID:", bulkRes.data.batch_id);
    console.log("Status:", bulkRes.data.status);
    console.log("Transaction count:", bulkRes.data.transaction_count);
    console.log("\nAll 3 deposits are now scheduled:");
    console.log("  1 →", formatForBlnk(firstRun));
    console.log("  2 →", formatForBlnk(secondRun));
    console.log("  3 →", formatForBlnk(thirdRun));
    console.log(
      "\nBlnk will apply each deposit automatically when its scheduled_for time is reached.",
    );

    // --- Step 3: Tracking goal progress ---
    console.log("\nStep 3: Fetching Mia's current savings balance...");

    const balanceRes = await blnk.get(`/balances/${miaSavingsBalanceId}`);
    const balanceRaw = balanceRes.data.balance ?? 0;
    const balanceDollars = balanceRaw / PRECISION;
    const creditBalance = balanceRes.data.credit_balance ?? 0;
    const debitBalance = balanceRes.data.debit_balance ?? 0;

    console.log("Mia's savings balance:", {
      balance_id: miaSavingsBalanceId,
      balance: `$${balanceDollars.toFixed(2)}`,
      credit_balance: creditBalance,
      debit_balance: debitBalance,
    });
    console.log(
      "\n💡 As deposits are applied, the balance will increase. Use the Blnk API to query transactions by goal_id to see which deposits have run (APPLIED) vs which are still scheduled (QUEUED).",
    );

    console.log("\n💡 Demo complete. See README for querying transactions by goal_id.");
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error("❌ Error running savings-goal demo:", err);
    if (err.response) {
      console.error("Response:", JSON.stringify(err.response.data, null, 2));
    }
    if (err.message) {
      console.error("Message:", err.message);
    }
    throw error;
  }
}

main();
