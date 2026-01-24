import { createWriteStream, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import PDFDocument from "pdfkit";
import type { Statement } from "./customerStatements.ts";

/**
 * Export a statement to CSV.
 *
 * CSV is the simplest “portable” format for statements: easy to inspect in a
 * spreadsheet and a good default when you want raw rows over layout.
 */
export async function exportCustomerStatementToCSV(statement: Statement): Promise<string> {
  const fileName = `statement_${statement.balance_id}_${statement.period.start}_${statement.period.end}.csv`.replace(/:/g, "-");

  const outputsDir = join(process.cwd(), "output");
  mkdirSync(outputsDir, { recursive: true });

  const filePath = join(outputsDir, fileName);

  const headers = ["Timestamp", "Reference", "Description", "Direction", "Counterparty", "Amount", "Currency"];

  const escapeCell = (value: unknown): string => {
    const s = String(value ?? "");
    const needsQuotes = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const lines: string[] = [];
  lines.push(headers.join(","));

  for (const tx of statement.transactions) {
    lines.push(
      [
        tx.timestamp,
        tx.reference,
        tx.description,
        tx.direction,
        tx.counterparty,
        tx.amount,
        tx.currency,
      ]
        .map(escapeCell)
        .join(",")
    );
  }

  await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
  return filePath;
}

/**
 * Export a statement to a simple PDF.
 *
 * This keeps layout intentionally basic: the goal is a readable demo artifact,
 * not a fully branded statement template.
 */
export async function exportCustomerStatementToPDF(statement: Statement): Promise<string> {
  const fileName = `statement_${statement.balance_id}_${statement.period.start}_${statement.period.end}.pdf`.replace(/:/g, "-");

  const outputsDir = join(process.cwd(), "output");
  mkdirSync(outputsDir, { recursive: true });

  const filePath = join(outputsDir, fileName);

  const doc = new PDFDocument({ margin: 50 });
  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(20).text("Customer Statement", { align: "center" });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Balance ID: ${statement.balance_id}`);
  doc.text(`Currency: ${statement.currency}`);
  if (statement.account_name) doc.text(`Account Name: ${statement.account_name}`);
  doc.moveDown();

  doc.text(
    `Period: ${new Date(statement.period.start).toLocaleDateString()} to ${new Date(statement.period.end).toLocaleDateString()}`
  );
  doc.moveDown();

  doc.fontSize(14).text("Summary", { underline: true });
  doc.fontSize(12);
  doc.moveDown(0.5);
  doc.text(`Opening Balance: ${statement.currency} ${statement.opening_balance}`);
  doc.text(`Closing Balance: ${statement.currency} ${statement.closing_balance}`);
  doc.text(`Total Credits: ${statement.currency} ${statement.totals.credits}`);
  doc.text(`Total Debits: ${statement.currency} ${statement.totals.debits}`);
  doc.text(`Transaction Count: ${statement.totals.transaction_count}`);
  doc.moveDown();

  doc.fontSize(14).text("Transactions", { underline: true });
  doc.moveDown(0.5);

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

  doc.font("Helvetica").fontSize(9);
  let y = tableTop + 20;
  const rowHeight = 15;
  const pageBottom = 750;

  statement.transactions.forEach((tx) => {
    if (y + rowHeight > pageBottom) {
      doc.addPage();

      doc.fontSize(10).font("Helvetica-Bold");
      const newTableTop = 50;
      x = 50;
      headers.forEach((header, i) => {
        const width = colWidths[i] ?? 100;
        doc.text(header, x, newTableTop, { width });
        x += width;
      });

      doc.font("Helvetica").fontSize(9);
      y = newTableTop + 20;
    }

    x = 50;
    const rowData = [
      tx.timestamp.split(" ")[0],
      tx.reference.substring(0, 20),
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

    y += rowHeight;
  });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}

