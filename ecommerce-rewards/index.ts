import { blnk } from "@resources/utils.ts";
import { generateReference } from "@resources/generator.ts";

const PRECISION = 100;
const REWARD_RATE = 0.05;

async function main() {
    try {
        console.log("🚀 Starting E-commerce Rewards Demo\n");

        console.log("Step 1: Creating ledgers...");
        const customerLedgerRes = await blnk.post("/ledgers", {
            name: "Customer Wallets",
            meta_data: { description: "Tracks customer real balances" },
        });
        const customerLedgerId = customerLedgerRes.data.ledger_id;
        if (!customerLedgerId) throw new Error("Failed to create Customer Wallets ledger");
        console.log("Customer Wallets ledger created:", customerLedgerId);

        const rewardsLedgerRes = await blnk.post("/ledgers", {
            name: "Rewards Accounts",
            meta_data: { description: "Tracks customer reward balances" },
        });
        const rewardsLedgerId = rewardsLedgerRes.data.ledger_id;
        if (!rewardsLedgerId) throw new Error("Failed to create Rewards Accounts ledger");
        console.log("Rewards Accounts ledger created:", rewardsLedgerId);
        console.log("");

        console.log("Step 2: Creating customer identity and balances...");
        const identityRes = await blnk.post("/identities", {
            identity_type: "individual",
            first_name: "Jane",
            last_name: "Customer",
            email_address: "jane.customer@example.com",
            meta_data: { customer_type: "ecommerce" },
        });
        const identityId = identityRes.data.identity_id;
        if (!identityId) throw new Error("Failed to create identity");
        console.log("Identity created:", identityId);

        const mainBalanceRes = await blnk.post("/balances", {
            ledger_id: customerLedgerId,
            identity_id: identityId,
            currency: "USD",
            meta_data: { type: "main" },
        });
        const mainBalanceId = mainBalanceRes.data.balance_id;
        if (!mainBalanceId) throw new Error("Failed to create main balance");
        console.log("Main balance created:", mainBalanceId);

        const rewardsBalanceRes = await blnk.post("/balances", {
            ledger_id: rewardsLedgerId,
            identity_id: identityId,
            currency: "USD",
            meta_data: { type: "rewards" },
        });
        const rewardsBalanceId = rewardsBalanceRes.data.balance_id;
        if (!rewardsBalanceId) throw new Error("Failed to create rewards balance");
        console.log("Rewards balance created:", rewardsBalanceId);
        console.log("");

        console.log("Step 3: Funding customer wallet and RewardsPool...");
        await blnk.post("/transactions", {
            amount: 200,
            precision: PRECISION,
            currency: "USD",
            source: "@WorldUSD",
            destination: mainBalanceId,
            reference: generateReference(),
            description: "Initial funding for customer",
            allow_overdraft: true,
            skip_queue: true,
            meta_data: { transaction_type: "funding" },
        });
        console.log("Customer main wallet funded with $200.00");

        await blnk.post("/transactions", {
            amount: 1000,
            precision: PRECISION,
            currency: "USD",
            source: "@WorldUSD",
            destination: "@RewardsPool",
            reference: generateReference(),
            description: "Fund RewardsPool for issuing rewards",
            allow_overdraft: true,
            skip_queue: true,
            meta_data: { transaction_type: "rewards_pool_funding" },
        });
        console.log("RewardsPool funded with $1000.00");
        console.log("");

        const purchaseAmount = 50;
        console.log("Step 4: Processing purchase ($50.00)...");
        const purchaseTx = await blnk.post("/transactions", {
            amount: purchaseAmount,
            precision: PRECISION,
            currency: "USD",
            source: mainBalanceId,
            destination: "@MerchantRevenue",
            reference: generateReference(),
            description: "Customer purchase",
            skip_queue: true,
            meta_data: { transaction_type: "purchase" },
        });
        console.log("Purchase transaction created:", purchaseTx.data.transaction_id);
        console.log("");

        const rewardAmount = purchaseAmount * REWARD_RATE;
        console.log("Step 5: Issuing rewards (5% = $" + rewardAmount.toFixed(2) + ")...");
        const rewardTx = await blnk.post("/transactions", {
            amount: rewardAmount,
            precision: PRECISION,
            currency: "USD",
            source: "@RewardsPool",
            destination: rewardsBalanceId,
            reference: generateReference(),
            description: "Reward issued for purchase",
            skip_queue: true,
            meta_data: { transaction_type: "reward_earned", reward_rate: "5%" },
        });
        console.log("Reward issued:", rewardTx.data.transaction_id);
        console.log("");

        const redeemAmount = 1.5;
        console.log("Step 6: Redeeming $" + redeemAmount.toFixed(2) + " in rewards...");
        const redeemTx = await blnk.post("/transactions", {
            amount: redeemAmount,
            precision: PRECISION,
            currency: "USD",
            source: rewardsBalanceId,
            destination: mainBalanceId,
            reference: generateReference(),
            description: "Reward redemption",
            skip_queue: true,
            meta_data: { transaction_type: "reward_redeemed" },
        });
        console.log("Reward redeemed:", redeemTx.data.transaction_id);
        console.log("");

        console.log("Step 7: Checking reward balance...");
        const balanceRes = await blnk.get(`/balances/${rewardsBalanceId}`);
        const balance = balanceRes.data.balance;
        const availableRewards = balance / PRECISION;
        const updatedAt = balanceRes.data.updated_at ?? balanceRes.data.created_at;
        console.log("Available rewards:", availableRewards.toFixed(2), "USD");
        console.log("Last updated:", updatedAt);
        console.log("");

        console.log("💡 Tip: View data on Blnk Cloud: https://cloud.blnkfinance.com");
    } catch (error: any) {
        console.error("❌ Error running demo:", error);
        if (error.response) {
            console.error("Error response:", JSON.stringify(error.response.data, null, 2));
        }
        if (error.message) {
            console.error("Error message:", error.message);
        }
        // Re-throw so callers or the runtime can decide how to handle failures
        throw error;
    }
}

main();
