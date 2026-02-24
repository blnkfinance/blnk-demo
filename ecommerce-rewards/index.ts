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
            first_name: "Sarah",
            last_name: "Shelton",
            email_address: "sarah.shelton@example.com",
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

        console.log("Step 3: Funding customer wallet...");
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
        console.log("");

        const purchaseAmount = 50;
        const rewardAmount = purchaseAmount * REWARD_RATE;
        console.log("Step 4: Processing purchase and issuing rewards atomically ($50.00 purchase, $" + rewardAmount.toFixed(2) + " reward)...");
        const bulkTx = await blnk.post("/transactions/bulk", {
            atomic: true,
            inflight: false,
            skip_queue: true,
            transactions: [
                {
                    amount: purchaseAmount,
                    precision: PRECISION,
                    currency: "USD",
                    reference: generateReference(),
                    source: mainBalanceId,
                    destination: "@MerchantRevenue",
                    description: "Customer purchase",
                    meta_data: { transaction_type: "purchase" },
                },
                {
                    amount: rewardAmount,
                    precision: PRECISION,
                    currency: "USD",
                    reference: generateReference(),
                    source: "@MerchantRevenue",
                    destination: rewardsBalanceId,
                    description: "Reward issued for purchase",
                    meta_data: { transaction_type: "reward_earned", reward_rate: "5%" },
                },
            ],
        });
        console.log("Bulk transaction created (batch_id):", bulkTx.data.batch_id);
        console.log("Purchase and reward issued atomically - both succeed or both fail");
        console.log("");

        console.log("Step 5: Fetching customer balances via Search API...");
        const searchRes = await blnk.post("/search/balances", {
            q: "*",
            filter_by: `identity_id:=${identityId}`,
            sort_by: "created_at:desc",
        });
        const hits = searchRes.data.hits ?? [];
        let foundMainId: string | null = null;
        let foundRewardsId: string | null = null;
        for (const hit of hits) {
            const doc = hit.document ?? {};
            const lid = doc.ledger_id;
            const bid = doc.balance_id;
            if (lid === customerLedgerId) foundMainId = bid;
            if (lid === rewardsLedgerId) foundRewardsId = bid;
        }
        if (!foundMainId) foundMainId = mainBalanceId;
        if (!foundRewardsId) foundRewardsId = rewardsBalanceId;
        console.log("Found main wallet:", foundMainId);
        console.log("Found rewards wallet:", foundRewardsId);
        console.log("(In your app you often have identity_id from login but not balance IDs - Search API lets you look them up)");
        console.log("");

        const redeemAmount = 1.5;
        console.log("Step 6: Redeeming $" + redeemAmount.toFixed(2) + " in rewards...");
        const redeemTx = await blnk.post("/transactions", {
            amount: redeemAmount,
            precision: PRECISION,
            currency: "USD",
            source: foundRewardsId,
            destination: foundMainId,
            reference: generateReference(),
            description: "Reward redemption",
            skip_queue: true,
            meta_data: { transaction_type: "reward_redeemed" },
        });
        console.log("Reward redeemed:", redeemTx.data.transaction_id);
        console.log("");

        console.log("Step 7: Checking reward balance...");
        const balanceRes = await blnk.get(`/balances/${foundRewardsId}`);
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
