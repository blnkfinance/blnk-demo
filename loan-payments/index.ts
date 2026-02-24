import { blnk } from "@resources/utils.ts";
import { generateReference } from "@resources/generator.ts";

const PRECISION = 100;

async function main() {
  try {
    console.log("🚀 Starting Loan Payments Demo\n");

    /**
     * Step 1: Create ledgers for main and loan wallets.
     */
    console.log("Step 1: Creating ledgers...");

    const customerLedgerRes = await blnk.post("/ledgers", {
      name: "Customer Main Ledger",
      meta_data: {
        description: "Contains all customer main balances for loan demo",
      },
    });
    const customerLedgerId = customerLedgerRes.data.ledger_id;
    if (!customerLedgerId) {
      throw new Error("Failed to create Customer Main Ledger");
    }
    console.log("Customer Main Ledger created:", customerLedgerId);

    const loanLedgerRes = await blnk.post("/ledgers", {
      name: "Customers Loan Ledger",
      meta_data: {
        description: "Contains all customer loan balances for loan demo",
      },
    });
    const loanLedgerId = loanLedgerRes.data.ledger_id;
    if (!loanLedgerId) {
      throw new Error("Failed to create Customers Loan Ledger");
    }
    console.log("Customers Loan Ledger created:", loanLedgerId);
    console.log("");

    /**
     * Step 2: Create a customer identity and their wallets.
     */
    console.log("Step 2: Creating customer identity and wallets...");

    const identityRes = await blnk.post("/identities", {
      identity_type: "individual",
      first_name: "Alex",
      last_name: "Lee",
      email_address: "alex.lee@example.com",
      meta_data: {
        customer_id: "CUST_001",
        demo: "loan-payments",
      },
    });
    const identityId = identityRes.data.identity_id;
    if (!identityId) {
      throw new Error("Failed to create identity");
    }
    console.log("Identity created:", identityId);

    // Main wallet for spendable funds.
    const mainWalletRes = await blnk.post("/balances", {
      ledger_id: customerLedgerId,
      identity_id: identityId,
      currency: "USD",
      meta_data: {
        account_type: "main",
        account_status: "active",
      },
    });
    const mainWalletId = mainWalletRes.data.balance_id;
    if (!mainWalletId) {
      throw new Error("Failed to create main wallet");
    }
    console.log("Main wallet created:", mainWalletId);

    // Loan wallet to track how much Alex owes.
    const loanWalletRes = await blnk.post("/balances", {
      ledger_id: loanLedgerId,
      identity_id: identityId,
      currency: "USD",
      meta_data: {
        account_type: "loan",
        account_status: "active",
      },
    });
    const loanWalletId = loanWalletRes.data.balance_id;
    if (!loanWalletId) {
      throw new Error("Failed to create loan wallet");
    }
    console.log("Loan wallet created:", loanWalletId);
    console.log("");

    /**
     * Step 3: Disburse a loan (using inflight so funds aren't available until we approve).
     *
     * Per the article: we record the loan as an overdraft from loan balance → main balance,
     * but use inflight so the transaction is held until eligibility checks pass. Then we
     * commit (approve) or void (reject). This prevents customers from accessing credit
     * before they're allowed.
     */
    console.log("Step 3: Requesting a $500.00 loan (inflight)...");

    const disbursementRef = generateReference();
    const disbursementRes = await blnk.post("/transactions", {
      amount: 500, // $500.00 (API uses amount in currency units; precision 100 gives cents)
      precision: PRECISION,
      currency: "USD",
      reference: disbursementRef,
      source: loanWalletId,
      destination: mainWalletId,
      description: "Loan disbursement to Alex",
      allow_overdraft: true,
      inflight: true,
      meta_data: {
        transaction_type: "loan_disbursement",
        customer_id: "CUST_001",
        loan_amount: 500,
      },
    });
    const inflightTxnId = disbursementRes.data.transaction_id;
    if (!inflightTxnId) throw new Error("Failed to create disbursement transaction");
    console.log("Inflight disbursement created:", inflightTxnId);

    // Simulate eligibility checks (KYC, loan limit, credit score, etc.)
    const kyc = true;
    const loanLimit = true;
    const creditScore = true;
    const approved = kyc && loanLimit && creditScore;

    if (approved) {
      await blnk.put(`/transactions/inflight/${inflightTxnId}`, { status: "commit" });
      console.log("Loan approved (inflight committed).");
    } else {
      await blnk.put(`/transactions/inflight/${inflightTxnId}`, { status: "void" });
      console.log("Loan rejected (inflight voided).");
      throw new Error("Demo assumes approval; set kyc/loanLimit/creditScore to true to continue.");
    }

    let mainBalance = await getBalance(mainWalletId);
    let loanBalance = await getBalance(loanWalletId);
    console.log(
      `Balances after disbursement → Main: $${mainBalance.toFixed(
        2,
      )}, Loan: $${loanBalance.toFixed(2)}\n`,
    );

    /**
     * Step 4: Charge interest on the outstanding loan.
     *
     * Money moves from the Loan Wallet to @InterestRevenue.
     */
    console.log("Step 4: Charging 1% daily interest on the loan...");

    const interestAmountDollars = 5; // 1% of $500 for this demo
    const interestRef = generateReference();
    const interestRes = await blnk.post("/transactions", {
      amount: interestAmountDollars, // $5.00 (API amount in currency units)
      precision: PRECISION,
      currency: "USD",
      reference: interestRef,
      source: loanWalletId,
      destination: "@InterestRevenue",
      description: "Daily interest charge",
      allow_overdraft: true,
      skip_queue: true,
      meta_data: {
        transaction_type: "interest_charge",
        interest_rate: 0.01,
        principal_amount: 500,
      },
    });
    console.log("Interest charge transaction:", interestRes.data.transaction_id);

    mainBalance = await getBalance(mainWalletId);
    loanBalance = await getBalance(loanWalletId);
    console.log(
      `Balances after interest → Main: $${mainBalance.toFixed(
        2,
      )}, Loan: $${loanBalance.toFixed(2)}\n`,
    );

    /**
     * Step 5: Record a loan repayment from the main wallet.
     *
     * Money moves from Main Wallet back to Loan Wallet.
     */
    console.log("Step 5: Recording a $200.00 repayment...");

    const repaymentRef = generateReference();
    const repaymentRes = await blnk.post("/transactions", {
      amount: 200, // $200.00 (API amount in currency units)
      precision: PRECISION,
      currency: "USD",
      reference: repaymentRef,
      source: mainWalletId,
      destination: loanWalletId,
      description: "Loan repayment from Alex",
      allow_overdraft: false,
      skip_queue: true,
      meta_data: {
        transaction_type: "loan_repayment",
        customer_id: "CUST_001",
        repayment_amount: 200,
      },
    });
    console.log("Repayment transaction:", repaymentRes.data.transaction_id);

    mainBalance = await getBalance(mainWalletId);
    loanBalance = await getBalance(loanWalletId);
    console.log(
      `Balances after repayment → Main: $${mainBalance.toFixed(
        2,
      )}, Loan: $${loanBalance.toFixed(2)}\n`,
    );

    console.log("💡 Demo complete. Try adjusting amounts to test other scenarios.");
  } catch (error: any) {
    console.error("❌ Error running loan-payments demo:", error);
    if (error.response) {
      console.error("Error response:", JSON.stringify(error.response.data, null, 2));
    }
    if (error.message) {
      console.error("Error message:", error.message);
    }
    throw error;
  }
}

/**
 * Helper to fetch a balance and convert it to dollars.
 */
async function getBalance(balanceId: string): Promise<number> {
  const res = await blnk.get(`/balances/${balanceId}`);
  const raw = res.data.balance ?? 0;
  return raw / PRECISION;
}

main();
