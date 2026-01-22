import { blnk } from "@resources/utils.ts";
import { generateReference } from "@resources/generator.ts";

async function main() {
    try {
        console.log("🚀 Starting Wallets Demo\n");

        // Step 1: Create a Ledger
        console.log("Step 1: Creating a ledger...");
        const ledgerResponse = await blnk.post("/ledgers", {
            name: "Customer Wallets Ledger",
            meta_data: {
                description: "Ledger for managing customer wallets",
                application: "Wallet Management System",
            },
        });
        const ledgerId = ledgerResponse.data.ledger_id;
        if (!ledgerId) {
            throw new Error("Failed to create ledger");
        }
        console.log(`✅ Ledger created: ${ledgerId}\n`);

        // Step 2: Create an Identity
        console.log("Step 2: Creating an identity...");
        const identityResponse = await blnk.post("/identities", {
            identity_type: "individual",
            first_name: "Esther",
            last_name: "Powell",
            email_address: "oliver.twist@example.com",
            meta_data: {
                customer_type: "individual",
            },
        });
        const identityId = identityResponse.data.identity_id;
        if (!identityId) {
            console.error("Identity creation response:", JSON.stringify(identityResponse.data, null, 2));
            throw new Error("Failed to create identity: identity_id is missing from response");
        }
        console.log(`✅ Identity created: ${identityId}\n`);

        // Step 3: Create Wallets (Balances)
        console.log("Step 3: Creating wallets...");
        
        // Main Wallet
        const mainWalletResponse = await blnk.post("/balances", {
            ledger_id: ledgerId,
            identity_id: identityId,
            currency: "USD",
            meta_data: {
                wallet_type: "main",
                status: "active",
            },
        });
        const mainWalletId = mainWalletResponse.data.balance_id;
        if (!mainWalletId) {
            throw new Error("Failed to create main wallet");
        }
        console.log(`✅ Main wallet created: ${mainWalletId}`);

        // Card Wallet
        const cardWalletResponse = await blnk.post("/balances", {
            ledger_id: ledgerId,
            identity_id: identityId,
            currency: "USD",
            meta_data: {
                wallet_type: "card",
                status: "active",
                card_details: {
                    masked_number: "xxxx-xxxx-xxxx-1234",
                    expiry: "12/25",
                    type: "virtual",
                },
            },
        });
        const cardWalletId = cardWalletResponse.data.balance_id;
        if (!cardWalletId) {
            throw new Error("Failed to create card wallet");
        }
        console.log(`✅ Card wallet created: ${cardWalletId}\n`);

        // Step 4: Deposit Funds
        console.log("Step 4: Depositing $100.00 to main wallet...");
        const depositResponse = await blnk.post("/transactions", {
            amount: 100.00,
            precision: 100,
            currency: "USD",
            source: "@WorldUSD",
            destination: mainWalletId,
            reference: generateReference(),
            description: "Deposit via bank",
            allow_overdraft: true,
            meta_data: {
                transaction_type: "deposit",
                channel: "bank_transfer",
            },
        });
        console.log(`✅ Deposit transaction created: ${depositResponse.data.transaction_id}\n`);

        // Step 5: Withdraw Funds
        console.log("Step 5: Withdrawing $50.00 from main wallet...");
        const withdrawalResponse = await blnk.post("/transactions", {
            amount: 50.00,
            precision: 100,
            currency: "USD",
            source: mainWalletId,
            destination: "@WorldUSD",
            reference: generateReference(),
            description: "Withdrawal to bank",
            meta_data: {
                transaction_type: "withdrawal",
                channel: "bank_transfer",
            },
        });
        console.log(`✅ Withdrawal transaction created: ${withdrawalResponse.data.transaction_id}\n`);

        // Step 6: Transfer Between Wallets
        console.log("Step 6: Transferring $25.00 from main wallet to card wallet...");
        const transferResponse = await blnk.post("/transactions", {
            amount: 25.00,
            precision: 100,
            currency: "USD",
            source: mainWalletId,
            destination: cardWalletId,
            reference: generateReference(),
            description: "Funding card wallet",
            meta_data: {
                transaction_type: "internal_transfer",
                purpose: "fund_card",
            },
        });
        console.log(`✅ Transfer transaction created: ${transferResponse.data.transaction_id}\n`);

        console.log(`💡 Tip: View full data on Blnk Cloud dashboard: https://cloud.blnkfinance.com`);
    } catch (error: any) {
        console.error("❌ Error running demo:", error);
        if (error.response) {
            console.error("Error response:", JSON.stringify(error.response.data, null, 2));
        }
        if (error.message) {
            console.error("Error message:", error.message);
        }
        process.exit(1);
    }
}

main();
