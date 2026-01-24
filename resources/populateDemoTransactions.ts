import { blnk, log } from "./utils.ts";
import { generateReference } from "./generator.ts";
import {
  generateDate,
  generateInternalBalanceId,
  generateRandomAmount,
  generateTransactionDescription,
  generateTransactionMetadata,
} from "./populateDemoHelpers.ts";

interface Balance {
  id: string;
  currency: string;
}

export interface TransactionResult {
  transactions: any[];
  bulkResults: any[];
  totalCreated: number;
  totalFailed: number;
  dateRange: {
    start: string;
    end: string;
  };
}

type TransactionType = "Deposit" | "Withdrawal" | "Inter";

/**
 * Simulate transactions between balances and post them via the bulk endpoint.
 *
 * We batch in large chunks so you can quickly seed thousands of transactions
 * without waiting for per-transaction round trips.
 */
export async function simulateTransactions(
  balances: Balance[],
  transactionCount: number,
  amountMin: number,
  amountMax: number,
  useInternalBalances: boolean = false
): Promise<TransactionResult> {
  try {
    log(`Starting transaction simulation for ${transactionCount} transactions`, "info");

    const endDate = new Date();
    const startDate = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

    const transactions: any[] = [];

    /**
     * Group balances by currency so inter-balance transfers only happen within
     * the same currency, avoiding mismatch errors.
     */
    const balancesByCurrency: Record<string, Balance[]> = {};
    balances.forEach((balance) => {
      (balancesByCurrency[balance.currency] ??= []).push(balance);
    });

    const availableCurrencies = useInternalBalances
      ? ["USD", "EUR", "GBP", "AUD", "CAD"]
      : Object.keys(balancesByCurrency);

    if (availableCurrencies.length === 0) {
      throw new Error("No currencies available for transactions");
    }

    for (let i = 0; i < transactionCount; i++) {
      try {
        const transactionType = getRandomTransactionType();
        const transaction = buildTransaction(
          transactionType,
          balancesByCurrency,
          useInternalBalances,
          availableCurrencies,
          amountMin,
          amountMax,
          startDate,
          endDate
        );
        transactions.push(transaction);
      } catch (error: any) {
        log(`Transaction ${i + 1}: ${error.message}, continuing with other transactions`, "warning");
      }
    }

    const batchSize = 5000;
    const bulkResults: any[] = [];
    let totalCreated = 0;
    let totalFailed = 0;

    if (transactions.length > 0) {
      const totalBatches = Math.ceil(transactions.length / batchSize);
      log(`Posting ${transactions.length} transactions in ${totalBatches} batch(es) of ${batchSize}...`, "info");

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, transactions.length);
        const batch = transactions.slice(start, end);
        const batchNumber = i + 1;

        try {
          log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} transactions)...`, "info");
          const batchResult = await blnk.post("/transactions/bulk", {
            transactions: batch,
            atomic: false,
            skip_queue: false,
            run_async: false,
          });
          bulkResults.push(batchResult);
          totalCreated += batch.length;
          log(`Batch ${batchNumber} completed: ${batch.length} transactions created`, "success");
        } catch (error: any) {
          totalFailed += batch.length;
          log(`Failed to execute batch ${batchNumber}: ${error.message}`, "error");
          bulkResults.push({ error: error.message, batch: batchNumber });
        }
      }

      log(
        `All batches completed: ${totalCreated} created, ${totalFailed} failed`,
        totalFailed > 0 ? "warning" : "success"
      );
    }

    log(`\nTransaction simulation completed!`, "success");
    log(`Summary:`, "info");
    log(`  • Requested transactions: ${transactionCount}`, "info");
    log(`  • Transactions created: ${transactions.length}`, "info");
    if (transactions.length !== transactionCount) {
      log(`  • Warning: Created ${transactions.length} transactions but requested ${transactionCount}`, "warning");
    }

    return {
      transactions,
      bulkResults,
      totalCreated,
      totalFailed,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  } catch (error: any) {
    log(`Transaction simulation failed: ${error.message}`, "error");
    throw error;
  }
}

function getRandomTransactionType(): TransactionType {
  const types: TransactionType[] = ["Deposit", "Withdrawal", "Inter"];
  const index = Math.floor(Math.random() * types.length);
  return types[index]!;
}

function buildTransaction(
  type: TransactionType,
  balancesByCurrency: Record<string, Balance[]>,
  useInternalBalances: boolean,
  availableCurrencies: string[],
  amountMin: number,
  amountMax: number,
  startDate: Date,
  endDate: Date
): any {
  const currencyIndex = Math.floor(Math.random() * availableCurrencies.length);
  const currency = availableCurrencies[currencyIndex];
  if (!currency) {
    throw new Error("No currencies available for transaction");
  }

  let source: string;
  let destination: string;

  if (useInternalBalances) {
    if (type === "Deposit") {
      source = `@World-${currency}`;
      destination = generateInternalBalanceId();
    } else if (type === "Withdrawal") {
      source = generateInternalBalanceId();
      destination = `@World-${currency}`;
    } else {
      source = generateInternalBalanceId();
      destination = generateInternalBalanceId();
      while (destination === source) destination = generateInternalBalanceId();
    }
  } else {
    const balances = balancesByCurrency[currency];
    if (!balances || balances.length === 0) {
      throw new Error(`No balances available for currency ${currency}`);
    }
    if (type === "Inter" && balances.length < 2) {
      throw new Error(`Not enough balances for inter transaction in currency ${currency}`);
    }

    const sourceBalanceIndex = Math.floor(Math.random() * balances.length);
    const sourceBalance = balances[sourceBalanceIndex];
    if (!sourceBalance) {
      throw new Error(`Failed to select source balance for currency ${currency}`);
    }

    let destinationBalance: Balance | undefined;
    if (type === "Inter") {
      let destinationIndex = Math.floor(Math.random() * balances.length);
      while (destinationIndex === sourceBalanceIndex) {
        destinationIndex = Math.floor(Math.random() * balances.length);
      }
      destinationBalance = balances[destinationIndex];
      if (!destinationBalance) {
        throw new Error(`Failed to select destination balance for currency ${currency}`);
      }
    }

    source = type === "Deposit" ? `@World-${currency}` : sourceBalance.id;
    if (type === "Inter") {
      if (!destinationBalance) throw new Error("Destination balance not set for Inter transaction");
      destination = destinationBalance.id;
    } else if (type === "Withdrawal") {
      destination = `@World-${currency}`;
    } else {
      destination = sourceBalance.id;
    }
  }

  const metadata = generateTransactionMetadata(type);
  const channel = metadata.channel;
  const merchant = metadata.merchant;
  const description = generateTransactionDescription(type, channel, merchant);

  return {
    amount: generateRandomAmount(amountMin, amountMax),
    precision: 100,
    currency,
    reference: generateReference(),
    source,
    destination,
    description,
    allow_overdraft: true,
    effective_date: generateDate({ startDate, endDate }),
    meta_data: metadata,
  };
}

