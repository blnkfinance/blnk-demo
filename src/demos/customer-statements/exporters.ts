import { createWriteStream, mkdirSync } from "fs";
import { join } from "path";
import PDFDocument from "pdfkit";
import { createObjectCsvWriter } from "csv-writer";
import type { Statement } from "./statementGenerator.ts";

/**
 * Export statement to CSV format
 */
export async function exportToCSV(statement: Statement): Promise<string> {
    const fileName = `statement_${statement.balance_id}_${statement.period.start}_${statement.period.end}.csv`.replace(
        /:/g,
        "-"
    );
    
    // Ensure output directory exists
    const outputsDir = join(process.cwd(), "output");
    mkdirSync(outputsDir, { recursive: true });
    
    const filePath = join(outputsDir, fileName);

    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
            { id: "timestamp", title: "Timestamp" },
            { id: "reference", title: "Reference" },
            { id: "description", title: "Description" },
            { id: "direction", title: "Direction" },
            { id: "counterparty", title: "Counterparty" },
            { id: "amount", title: "Amount" },
            { id: "currency", title: "Currency" },
        ],
    });

    await csvWriter.writeRecords(statement.transactions);

    return filePath;
}

/**
 * Export statement to PDF format
 */
export async function exportToPDF(statement: Statement): Promise<string> {
    const fileName = `statement_${statement.balance_id}_${statement.period.start}_${statement.period.end}.pdf`.replace(
        /:/g,
        "-"
    );
    
    // Ensure output directory exists
    const outputsDir = join(process.cwd(), "output");
    mkdirSync(outputsDir, { recursive: true });
    
    const filePath = join(outputsDir, fileName);

    const doc = new PDFDocument({ margin: 50 });
    const stream = createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text("Customer Statement", { align: "center" });
    doc.moveDown();

    // Account Information
    doc.fontSize(12);
    doc.text(`Balance ID: ${statement.balance_id}`);
    doc.text(`Currency: ${statement.currency}`);
    if (statement.account_name) {
        doc.text(`Account Name: ${statement.account_name}`);
    }
    doc.moveDown();

    // Period
    doc.text(
        `Period: ${new Date(statement.period.start).toLocaleDateString()} to ${new Date(statement.period.end).toLocaleDateString()}`
    );
    doc.moveDown();

    // Summary Section
    doc.fontSize(14).text("Summary", { underline: true });
    doc.fontSize(12);
    doc.moveDown(0.5);
    doc.text(`Opening Balance: ${statement.currency} ${statement.opening_balance}`);
    doc.text(`Closing Balance: ${statement.currency} ${statement.closing_balance}`);
    doc.text(`Total Credits: ${statement.currency} ${statement.totals.credits}`);
    doc.text(`Total Debits: ${statement.currency} ${statement.totals.debits}`);
    doc.text(`Transaction Count: ${statement.totals.transaction_count}`);
    doc.moveDown();

    // Transactions Table
    doc.fontSize(14).text("Transactions", { underline: true });
    doc.moveDown(0.5);

    // Table headers
    const tableTop = doc.y;
    const colWidths = [80, 100, 120, 40, 100, 80, 60];
    const headers = ["Timestamp", "Reference", "Description", "Dir", "Counterparty", "Amount", "Currency"];

    doc.fontSize(10).font("Helvetica-Bold");
    let x = 50;
    headers.forEach((header, i) => {
        const width = colWidths[i] ?? 100;
        doc.text(header, x, tableTop, { width });
        x += width;
    });

    // Table rows
    doc.font("Helvetica").fontSize(9);
    let y = tableTop + 20;
    statement.transactions.forEach((tx) => {
        if (y > 750) {
            doc.addPage();
            y = 50;
        }

        x = 50;
        const rowData = [
            tx.timestamp.split(" ")[0], // Date only
            tx.reference,
            tx.description.substring(0, 20),
            tx.direction,
            tx.counterparty.substring(0, 15),
            tx.amount,
            tx.currency,
        ];

        rowData.forEach((data, i) => {
            const width = colWidths[i] ?? 100;
            doc.text(String(data), x, y, { width });
            x += width;
        });

        y += 15;
    });

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on("finish", () => resolve(filePath));
        stream.on("error", reject);
    });
}
