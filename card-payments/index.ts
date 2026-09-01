import { blnk } from "@resources/utils.ts";
import { generateReference } from "@resources/generator.ts";

const PRECISION = 100;

async function main() {
    try {
        console.log("🚀 Starting Card Payments Demo\n");

        /**
         * 1. Create a ledger to group this customer's card activity.
         */
        console.log("Step 1: Creating card ledger...");
        const ledgerRes = await blnk.post("/ledgers", {
            name: "Customers Card Ledger",
            meta_data: {
                description: "Ledger for card authorization and settlement demo",
                demo: "card-payments",
            },
        });
        const ledgerId: string | undefined = ledgerRes.data.ledger_id;
        if (!ledgerId) {
            console.error("Ledger response:", JSON.stringify(ledgerRes.data, null, 2));
            throw new Error("Failed to create ledger");
        }
        console.log(`✅ Ledger created: ${ledgerId}\n`);

        /**
         * 2. Create a customer identity that owns the card.
         */
        console.log("Step 2: Creating customer identity...");
        const identityRes = await blnk.post("/identities", {
            identity_type: "individual",
            first_name: "Xavier",
            last_name: "Woods",
            meta_data: {
                demo: "card-payments",
            },
        });
        const identityId: string | undefined = identityRes.data.identity_id;
        if (!identityId) {
            console.error("Identity response:", JSON.stringify(identityRes.data, null, 2));
            throw new Error("Failed to create identity");
        }
        console.log(`✅ Identity created: ${identityId}\n`);

        /**
         * 3. Create a card balance for this customer.
         */
        console.log("Step 3: Creating card balance...");
        const balanceRes = await blnk.post("/balances", {
            ledger_id: ledgerId,
            identity_id: identityId,
            currency: "USD",
            meta_data: {
                last_4_digits: "1234",
                card_scheme: "visa",
                type: "virtual",
                "card-id": "card-id-1234",
                demo: "card-payments",
            },
        });
        const cardBalanceId: string | undefined = balanceRes.data.balance_id;
        if (!cardBalanceId) {
            console.error("Balance response:", JSON.stringify(balanceRes.data, null, 2));
            throw new Error("Failed to create card balance");
        }
        console.log(`✅ Card balance created: ${cardBalanceId}\n`);

        /**
         * 4. Fund the card so we can authorize a payment.
         */
        console.log("Step 4: Funding card balance with $5,000.00...");
        const fundingRef = generateReference();
        const fundingRes = await blnk.post("/transactions", {
            amount: 5000 * PRECISION, // $5,000.00
            precision: PRECISION,
            currency: "USD",
            source: "@World-USD",
            destination: cardBalanceId,
            reference: fundingRef,
            description: "Initial card funding",
            allow_overdraft: true,
            skip_queue: true,
            meta_data: {
                transaction_type: "card_funding",
                demo: "card-payments",
            },
        });
        console.log(`✅ Funding transaction created: ${fundingRes.data.transaction_id}\n`);

        let cardBalance = await getBalance(cardBalanceId);
        console.log(`💰 Card balance after funding: $${cardBalance.toFixed(2)}\n`);

        /**
         * 5. Authorize a card payment using an inflight transaction.
         */
        console.log("Step 5: Authorizing a $2,000.00 card payment (inflight)...");
        const authRef = generateReference();
        const authRes = await blnk.post("/transactions", {
            amount: 2000 * PRECISION, // $2,000.00
            precision: PRECISION,
            currency: "USD",
            reference: authRef,
            source: cardBalanceId,
            destination: "@World-USD",
            description: "Card transaction authorization",
            inflight: true,
            meta_data: {
                transaction_type: "card_authorization",
                merchant: "Example Merchant",
                demo: "card-payments",
            },
        });
        const inflightTransactionId: string | undefined = authRes.data.transaction_id;
        if (!inflightTransactionId) {
            console.error("Authorization response:", JSON.stringify(authRes.data, null, 2));
            throw new Error("Failed to create inflight authorization");
        }
        console.log(`✅ Inflight authorization created: ${inflightTransactionId}`);
        console.log(`   Status: ${authRes.data.status}\n`);

        cardBalance = await getBalance(cardBalanceId);
        console.log(`💳 Available card balance after authorization (reservation applied): $${cardBalance.toFixed(2)}\n`);

        /**
         * 6. Commit the inflight transaction to simulate settlement success.
         */
        console.log("Step 6: Settling the inflight transaction (commit)...");
        const commitRes = await blnk.put(`/transactions/inflight/${inflightTransactionId}`, {
            status: "commit",
        });
        console.log(`✅ Inflight transaction committed. New status: ${commitRes.data.status}\n`);

        cardBalance = await getBalance(cardBalanceId);
        console.log(`💸 Card balance after settlement: $${cardBalance.toFixed(2)}\n`);

        /**
         * 7. Create and then void another authorization to show cancellation flow.
         */
        console.log("Step 7: Authorizing another $500.00 payment then voiding it...");
        const voidAuthRef = generateReference();
        const voidAuthRes = await blnk.post("/transactions", {
            amount: 500 * PRECISION, // $500.00
            precision: PRECISION,
            currency: "USD",
            reference: voidAuthRef,
            source: cardBalanceId,
            destination: "@World-USD",
            description: "Card transaction authorization (to be voided)",
            inflight: true,
            meta_data: {
                transaction_type: "card_authorization",
                merchant: "Example Merchant 2",
                demo: "card-payments",
            },
        });
        const inflightToVoidId: string | undefined = voidAuthRes.data.transaction_id;
        if (!inflightToVoidId) {
            console.error("Void-authorization response:", JSON.stringify(voidAuthRes.data, null, 2));
            throw new Error("Failed to create inflight authorization to void");
        }
        console.log(`✅ Second inflight authorization created: ${inflightToVoidId}`);
        console.log(`   Status: ${voidAuthRes.data.status}\n`);

        cardBalance = await getBalance(cardBalanceId);
        console.log(`💳 Card balance after second authorization (reserved): $${cardBalance.toFixed(2)}\n`);

        console.log("Voiding the second inflight transaction...");
        const voidRes = await blnk.put(`/transactions/inflight/${inflightToVoidId}`, {
            status: "void",
        });
        console.log(`✅ Inflight transaction voided. New status: ${voidRes.data.status}\n`);

        cardBalance = await getBalance(cardBalanceId);
        console.log(`✅ Final card balance after void: $${cardBalance.toFixed(2)}\n`);

        console.log("🎉 Card payments demo complete.");
    } catch (error: any) {
        console.error("❌ Error running card-payments demo:", error);
        if (error.response) {
            console.error("Error response:", JSON.stringify(error.response.data, null, 2));
        }
        if (error.message) {
            console.error("Error message:", error.message);
        }
        process.exit(1);
    }
}

async function getBalance(balanceId: string): Promise<number> {
    const res = await blnk.get(`/balances/${balanceId}`);
    const raw: number = res.data.balance ?? 0;
    return raw / PRECISION;
}

main();

