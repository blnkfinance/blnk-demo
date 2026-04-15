import { resolve } from "node:path";
import {
    seedDemoData,
    createDryRunState,
    type MismatchScenario,
} from "./seedDemoData.ts";
import {
    loadState,
    writeExternalCsv,
    buildMismatchSummary,
    validateState,
} from "./stripeToBlnkCsv.ts";

type Command = "seed" | "export" | "all" | "dry-run";

function parseMismatchScenarios(rawValue: string | undefined): MismatchScenario[] {
    if (!rawValue) {
        return [];
    }

    const validScenarios: MismatchScenario[] = ["missing_ledger", "wrong_reference", "wrong_amount"];
    const parsed = rawValue
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

    const scenarios: MismatchScenario[] = [];
    for (const value of parsed) {
        if (!validScenarios.includes(value as MismatchScenario)) {
            throw new Error(
                `Invalid mismatch scenario "${value}". Use only: ${validScenarios.join(", ")}`,
            );
        }
        scenarios.push(value as MismatchScenario);
    }
    return scenarios;
}

function getCommand(): Command {
    const rawCommand = (process.argv[2] ?? "all").toLowerCase();
    if (rawCommand !== "seed" && rawCommand !== "export" && rawCommand !== "all" && rawCommand !== "dry-run") {
        throw new Error(`Unknown command "${rawCommand}". Use one of: seed, export, all, dry-run.`);
    }
    return rawCommand;
}

function parseStatePathArg(): string | undefined {
    const stateFlagIndex = process.argv.findIndex((arg) => arg === "--state");
    if (stateFlagIndex === -1) {
        return undefined;
    }
    const statePath = process.argv[stateFlagIndex + 1];
    if (!statePath) {
        throw new Error("Expected a path after --state.");
    }
    return statePath;
}

function printCloudChecklist(csvPath: string): void {
    console.log("\nBlnk Cloud checklist:");
    console.log("1) Go to Reconciliation -> External Data and upload:");
    console.log(`   ${csvPath}`);
    console.log("2) Use matching rule:");
    console.log("   - amount: exact");
    console.log("   - currency: exact");
    console.log("   - reference: contains");
    console.log("   - date: equals with 30-minute drift");
    console.log("3) Strategy: one-to-one");
    console.log("4) Run reconciliation and inspect matched/unmatched records.");
}

async function runSeed(outputDir: string) {
    const depositCount = Number.parseInt(process.env.DEMO_DEPOSIT_COUNT ?? "10", 10);
    if (Number.isNaN(depositCount) || depositCount <= 0) {
        throw new Error("DEMO_DEPOSIT_COUNT must be a positive integer.");
    }

    const currency = (process.env.DEMO_CURRENCY ?? "usd").toLowerCase();
    const mismatchScenarios = parseMismatchScenarios(process.env.DEMO_MISMATCH_SCENARIOS);
    const identityFirstName = process.env.DEMO_IDENTITY_FIRST_NAME ?? "Pouch";
    const identityLastName = process.env.DEMO_IDENTITY_LAST_NAME ?? "Customer";

    const { state, statePath } = await seedDemoData({
        depositCount,
        currency,
        mismatchScenarios,
        outputDir,
        identityFirstName,
        identityLastName,
    });

    console.log("\nSeed complete.");
    console.log(`Batch: ${state.batchId}`);
    console.log(`State file: ${statePath}`);
    console.log(`Ledger: ${state.ledgerId}`);
    console.log(`Identity: ${state.identityId}`);
    console.log(`Wallet: ${state.walletId}`);

    return { state, statePath };
}

async function runExport(outputDir: string, maybeStatePath?: string) {
    const statePath = maybeStatePath ?? resolve(outputDir, "latest-state.json");
    const state = await loadState(statePath);
    const validation = validateState(state);
    if (!validation.isValid) {
        throw new Error(`State validation failed:\n- ${validation.issues.join("\n- ")}`);
    }

    const { csvPath, rowCount } = await writeExternalCsv(state, outputDir);
    const mismatchSummary = buildMismatchSummary(state);

    console.log("\nCSV export complete.");
    console.log(`Batch: ${state.batchId}`);
    console.log(`Rows: ${rowCount}`);
    console.log(`CSV path: ${csvPath}`);
    console.log("\nExpected reconciliation outcome:");
    console.log(`- Matched: ${mismatchSummary.expectedMatched}`);
    console.log(`- Unmatched external: ${mismatchSummary.expectedUnmatchedExternal}`);
    console.log(`- Unreconciled ledger: ${mismatchSummary.expectedUnreconciledLedger}`);

    console.log("\nState validation checks passed.");

    printCloudChecklist(csvPath);
}

async function main() {
    const command = getCommand();
    const outputDir = process.env.DEMO_OUTPUT_DIR ?? "./output";
    const statePathArg = parseStatePathArg();

    if (command === "seed") {
        await runSeed(outputDir);
        return;
    }

    if (command === "dry-run") {
        const depositCount = Number.parseInt(process.env.DEMO_DEPOSIT_COUNT ?? "10", 10);
        const currency = (process.env.DEMO_CURRENCY ?? "usd").toLowerCase();
        const mismatchScenarios = parseMismatchScenarios(process.env.DEMO_MISMATCH_SCENARIOS);
        const identityFirstName = process.env.DEMO_IDENTITY_FIRST_NAME ?? "Pouch";
        const identityLastName = process.env.DEMO_IDENTITY_LAST_NAME ?? "Customer";
        const { statePath } = await createDryRunState({
            depositCount,
            currency,
            mismatchScenarios,
            outputDir,
            identityFirstName,
            identityLastName,
        });
        console.log("Dry-run state generated without Stripe or Blnk API calls.");
        await runExport(outputDir, statePath);
        return;
    }

    if (command === "export") {
        await runExport(outputDir, statePathArg);
        return;
    }

    const { statePath } = await runSeed(outputDir);
    await runExport(outputDir, statePath);
}

main().catch((error: unknown) => {
    if (error instanceof Error) {
        console.error(`\nError: ${error.message}`);
    } else {
        console.error("\nUnknown error:", error);
    }
    process.exit(1);
});
