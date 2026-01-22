import { generateStatement } from "./statementGenerator.ts";
import { exportToCSV, exportToPDF } from "./exporters.ts";

// Configuration - Load from environment variables
const BALANCE_ID = process.env.STATEMENT_BALANCE_ID;
const CURRENCY = process.env.STATEMENT_CURRENCY || "USD";
const PERIOD_START = process.env.STATEMENT_PERIOD_START;
const PERIOD_END = process.env.STATEMENT_PERIOD_END;

async function main() {
    try {
        // Validate required configuration
        if (!BALANCE_ID) {
            throw new Error("STATEMENT_BALANCE_ID environment variable is required");
        }
        if (!PERIOD_START) {
            throw new Error("STATEMENT_PERIOD_START environment variable is required");
        }
        if (!PERIOD_END) {
            throw new Error("STATEMENT_PERIOD_END environment variable is required");
        }

        // Parse command-line arguments
        const formatArg = process.argv.find((arg) => arg.startsWith("--format="));
        const format = formatArg?.split("=")[1] || "csv";
        const outputFormat = format === "pdf" ? "pdf" : "csv";

        if (outputFormat !== "csv" && outputFormat !== "pdf") {
            throw new Error(`Invalid format: ${outputFormat}. Use 'csv' or 'pdf'`);
        }

        console.log("🚀 Starting Customer Statements Demo\n");
        console.log(`Balance ID: ${BALANCE_ID}`);
        console.log(`Currency: ${CURRENCY}`);
        console.log(`Period: ${PERIOD_START} to ${PERIOD_END}`);
        console.log(`Output Format: ${outputFormat.toUpperCase()}\n`);

        // Step 1: Generate statement
        console.log("Step 1: Querying transactions from database...");
        console.log("Step 2: Fetching historical balances...");
        console.log("Step 3: Formatting data...");
        const statement = await generateStatement(BALANCE_ID, CURRENCY, PERIOD_START, PERIOD_END);
        console.log(`✅ Statement generated with ${statement.totals.transaction_count} transactions\n`);

        // Step 2: Export to file
        console.log(`Step 4: Exporting to ${outputFormat.toUpperCase()}...`);
        let filePath: string;
        if (outputFormat === "pdf") {
            filePath = await exportToPDF(statement);
        } else {
            filePath = await exportToCSV(statement);
        }

        console.log(`✅ Statement exported successfully!`);
        console.log(`📄 File saved to: ${filePath}\n`);
    } catch (error: any) {
        console.error("❌ Error generating statement:", error.message);
        if (error.response) {
            console.error("API Error:", JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    } finally {
        // Close database connection
        const { db } = await import("@resources/db.ts");
        await db.end();
    }
}

main();
