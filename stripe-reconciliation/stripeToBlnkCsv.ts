import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { SeedState } from "./seedDemoData.ts";

export interface ExternalDataRow {
    id: string;
    amount: string;
    reference: string;
    currency: string;
    date: string;
    source: string;
    description: string;
}

export interface StateValidationResult {
    isValid: boolean;
    issues: string[];
}

function centsToMajorString(amountMinor: number): string {
    return (amountMinor / 100).toFixed(2);
}

function escapeCsv(value: string): string {
    if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
        return `"${value.replace(/"/g, "\"\"")}"`;
    }
    return value;
}

function toCsv(rows: ExternalDataRow[]): string {
    const header = ["id", "amount", "reference", "currency", "date", "source", "description"];
    const lines = [header.join(",")];
    for (const row of rows) {
        const line = [
            row.id,
            row.amount,
            row.reference,
            row.currency,
            row.date,
            row.source,
            row.description,
        ].map(escapeCsv).join(",");
        lines.push(line);
    }
    return lines.join("\n");
}

export async function loadState(statePath: string): Promise<SeedState> {
    const raw = await readFile(resolve(statePath), "utf8");
    return JSON.parse(raw) as SeedState;
}

export function buildExternalRows(state: SeedState): ExternalDataRow[] {
    return state.records.map((record, index) => ({
        id: `ext_${state.batchId}_${index + 1}`,
        amount: centsToMajorString(record.netMinor),
        reference: record.paymentIntentId,
        currency: record.currency.toUpperCase(),
        date: record.settledAt,
        source: "Stripe",
        description: `Net settlement for ${record.paymentIntentId}`,
    }));
}

export function validateState(state: SeedState): StateValidationResult {
    const issues: string[] = [];

    if (state.records.length === 0) {
        issues.push("State file has no records.");
    }

    for (const [index, record] of state.records.entries()) {
        const rowName = `record ${index + 1}`;
        if (!record.paymentIntentId.startsWith("pi_")) {
            issues.push(`${rowName}: paymentIntentId must start with pi_.`);
        }
        if (!record.balanceTransactionId.startsWith("txn_")) {
            issues.push(`${rowName}: balanceTransactionId must start with txn_.`);
        }
        if (!record.settledAt.endsWith("Z")) {
            issues.push(`${rowName}: settledAt must be UTC ISO format ending with Z.`);
        }
        if (record.netMinor <= 0) {
            issues.push(`${rowName}: netMinor must be greater than 0.`);
        }
        if (record.mismatchScenario === "missing_ledger" && record.ledgerTransactionId) {
            issues.push(`${rowName}: missing_ledger cannot include ledgerTransactionId.`);
        }
        if ((record.mismatchScenario === "wrong_reference" || record.mismatchScenario === "wrong_amount") && !record.ledgerTransactionId) {
            issues.push(`${rowName}: ${record.mismatchScenario} must include ledgerTransactionId.`);
        }
    }

    return {
        isValid: issues.length === 0,
        issues,
    };
}

export async function writeExternalCsv(
    state: SeedState,
    outputDir: string,
): Promise<{ csvPath: string; rowCount: number }> {
    const rows = buildExternalRows(state);
    const csv = toCsv(rows);
    const absoluteOutputDir = resolve(outputDir);
    await mkdir(absoluteOutputDir, { recursive: true });
    const csvPath = resolve(absoluteOutputDir, `${state.batchId}-stripe-external-data.csv`);
    await writeFile(csvPath, csv, "utf8");
    return { csvPath, rowCount: rows.length };
}

export function buildMismatchSummary(state: SeedState): {
    expectedMatched: number;
    expectedUnmatchedExternal: number;
    expectedUnreconciledLedger: number;
} {
    let expectedMatched = 0;
    let expectedUnmatchedExternal = 0;
    let expectedUnreconciledLedger = 0;

    for (const record of state.records) {
        if (!record.mismatchScenario) {
            expectedMatched += 1;
            continue;
        }

        if (record.mismatchScenario === "missing_ledger") {
            expectedUnmatchedExternal += 1;
            continue;
        }

        if (record.mismatchScenario === "wrong_reference" || record.mismatchScenario === "wrong_amount") {
            expectedUnmatchedExternal += 1;
            expectedUnreconciledLedger += 1;
        }
    }

    return {
        expectedMatched,
        expectedUnmatchedExternal,
        expectedUnreconciledLedger,
    };
}
