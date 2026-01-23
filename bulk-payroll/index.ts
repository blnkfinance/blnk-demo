import { blnk, log } from "@resources/utils.ts";
import { parse } from "csv-parse";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// Configuration
const TOTAL_EMPLOYEES = parseInt(process.env.TOTAL_EMPLOYEES || "3000", 10);
const SYNC_BATCH_SIZE = parseInt(process.env.SYNC_BATCH_SIZE || "100", 10);
const SALARY_MIN = parseFloat(process.env.SALARY_MIN || "3000.00");
const SALARY_MAX = parseFloat(process.env.SALARY_MAX || "15000.00");
const CSV_FILE = process.env.CSV_FILE || "employees.csv";
const PROCESSING_MODE = process.env.PROCESSING_MODE || "async"; // "sync" or "async"

const COUNTRIES = [
    { code: "USA", name: "United States", currency: "USD" },
    { code: "ITA", name: "Italy", currency: "EUR" },
    { code: "GBR", name: "United Kingdom", currency: "GBP" },
    { code: "CAN", name: "Canada", currency: "CAD" },
    { code: "AUS", name: "Australia", currency: "AUD" },
    { code: "FRA", name: "France", currency: "EUR" },
    { code: "DEU", name: "Germany", currency: "EUR" },
    { code: "JPN", name: "Japan", currency: "JPY" },
    { code: "SGP", name: "Singapore", currency: "SGD" },
    { code: "NLD", name: "Netherlands", currency: "EUR" },
    { code: "SWE", name: "Sweden", currency: "SEK" },
    { code: "CHE", name: "Switzerland", currency: "CHF" },
];

interface EmployeeRecord {
    employee_id: string;
    name: string;
    country_code: string;
    currency: string;
    salary_amount: number; // in display units
    salary_cents: number; // in precise units
}

interface Employee extends EmployeeRecord {
    identity_id?: string;
    balance_id?: string;
    ledger_id?: string;
}

interface LedgerInfo {
    ledger_id: string;
    country_code: string;
    currency: string; // Always USD, but kept for consistency
}

// Generate employee names
function generateEmployeeName(index: number): string {
    const firstNames = [
        "Stacy", "Gene", "Sarah", "Michael", "Emily", "David", "Lisa", "James", "Maria", "Robert",
        "Jennifer", "William", "Patricia", "Richard", "Linda", "Joseph", "Elizabeth", "Thomas", "Jessica", "Charles",
        "Susan", "Christopher", "Karen", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Margaret", "Mark"
    ];
    const lastNames = [
        "Jones", "Wells", "Chen", "Smith", "Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson",
        "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia",
        "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young"
    ];
    return `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
}

// Generate sample CSV file
function generateSampleCSV(filePath: string, employeeCount: number): void {
    log(`Generating CSV file with ${employeeCount} employees...`, "info");
    
    const csvLines: string[] = ["employee_id,name,country_code,currency,salary_amount"];

    for (let i = 0; i < employeeCount; i++) {
        const employeeId = `EMP${String(i + 1).padStart(4, "0")}`;
        const name = generateEmployeeName(i);
        const country = COUNTRIES[i % COUNTRIES.length];
        if (!country) {
            throw new Error(`Invalid country index: ${i % COUNTRIES.length}`);
        }
        const salary = (Math.random() * (SALARY_MAX - SALARY_MIN) + SALARY_MIN).toFixed(2);
        
        // All employees use USD currency regardless of country
        csvLines.push(`${employeeId},${name},${country.code},USD,${salary}`);
    }
    
    writeFileSync(filePath, csvLines.join("\n"), "utf-8");
    log(`✅ CSV file generated: ${filePath}`, "success");
}

// Parse CSV file
async function parseEmployeeCSV(filePath: string): Promise<EmployeeRecord[]> {
    log(`Parsing CSV file: ${filePath}...`, "info");
    
    if (!existsSync(filePath)) {
        throw new Error(`CSV file not found: ${filePath}`);
    }
    
    const fileContent = readFileSync(filePath, "utf-8");
    const records = await new Promise<Array<Record<string, string>>>((resolve, reject) => {
        const results: Array<Record<string, string>> = [];
        parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        })
            .on("data", (data: Record<string, string>) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", (error: Error) => reject(error));
    });
    
    // Validate required columns
    const requiredColumns = ["employee_id", "name", "country_code", "currency", "salary_amount"];
    const firstRecord = records[0];
    if (!firstRecord) {
        throw new Error("CSV file is empty");
    }
    
    for (const col of requiredColumns) {
        if (!(col in firstRecord)) {
            throw new Error(`Missing required column: ${col}`);
        }
    }
    
        // Parse and convert to EmployeeRecord
        const employees: EmployeeRecord[] = records.map((record) => {
        const employeeId = record.employee_id;
        const name = record.name;
        const countryCode = record.country_code;
        const salaryAmountStr = record.salary_amount;
        
        if (!employeeId || !name || !countryCode || !salaryAmountStr) {
            throw new Error(`Missing required fields in CSV record: ${JSON.stringify(record)}`);
        }
        
        const salaryAmount = parseFloat(salaryAmountStr);
        if (isNaN(salaryAmount) || salaryAmount <= 0) {
            throw new Error(`Invalid salary_amount for employee ${employeeId}: ${salaryAmountStr}`);
        }
        
        // Convert to precise units (cents)
        const salaryCents = Math.round(salaryAmount * 100);
        
        // All employees use USD currency regardless of country
        return {
            employee_id: employeeId,
            name: name,
            country_code: countryCode,
            currency: "USD",
            salary_amount: salaryAmount,
            salary_cents: salaryCents,
        };
    });
    
    log(`✅ Parsed ${employees.length} employees from CSV`, "success");
    return employees;
}

// Setup ledgers for each unique country
async function setupLedgers(countries: Set<string>): Promise<Map<string, LedgerInfo>> {
    log(`Setting up ledgers for ${countries.size} countries...`, "info");
    
    const ledgerMap = new Map<string, LedgerInfo>();
    
    for (const countryCode of countries) {
        const country = COUNTRIES.find((c) => c.code === countryCode);
        if (!country) {
            log(`Warning: Unknown country code ${countryCode}, skipping ledger creation`, "warning");
            continue;
        }
        
        try {
            log(`Creating ledger for ${country.name} (${country.code})...`, "info");
            const ledgerResponse = await blnk.post("/ledgers", {
                name: `Acme Inc. - ${country.name} Payroll Ledger`,
                meta_data: {
                    country_code: country.code,
                    country_name: country.name,
                    currency: "USD", // All ledgers use USD
                    purpose: "payroll",
                },
            });
            
            const ledgerId = ledgerResponse.data.ledger_id;
            if (!ledgerId) {
                throw new Error(`Failed to create ledger for ${country.name}`);
            }
            
            ledgerMap.set(countryCode, {
                ledger_id: ledgerId,
                country_code: country.code,
                currency: "USD", // All ledgers use USD
            });
            
            log(`✅ Ledger created: ${ledgerId}`, "success");
        } catch (error: any) {
            log(`Failed to create ledger for ${countryCode}: ${error.message}`, "error");
            throw error;
        }
    }
    
    log(`✅ Created ${ledgerMap.size} ledgers\n`, "success");
    return ledgerMap;
}

// Create employee identities and balances
async function createEmployees(
    employees: EmployeeRecord[],
    ledgerMap: Map<string, LedgerInfo>
): Promise<Employee[]> {
    log(`Creating identities and balances for ${employees.length} employees...`, "info");
    
    const createdEmployees: Employee[] = [];
    const errors: Array<{ employee_id: string; error: string }> = [];
    
    for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        if (!emp) {
            continue;
        }
        
        const ledgerInfo = ledgerMap.get(emp.country_code);
        
        if (!ledgerInfo) {
            errors.push({
                employee_id: emp.employee_id,
                error: `No ledger found for country ${emp.country_code}`,
            });
            continue;
        }
        
        try {
            // Create identity
            const [firstName, ...lastNameParts] = emp.name.split(" ");
            const lastName = lastNameParts.join(" ") || firstName;
            const email = `${emp.name.toLowerCase().replace(/\s+/g, ".")}@acme.com`;
            
            const identityResponse = await blnk.post("/identities", {
                identity_type: "individual",
                first_name: firstName,
                last_name: lastName,
                email_address: email,
                meta_data: {
                    employee_id: emp.employee_id,
                    country_code: emp.country_code,
                    department: "Engineering",
                },
            });
            
            const identityId = identityResponse.data.identity_id;
            if (!identityId) {
                errors.push({
                    employee_id: emp.employee_id,
                    error: "Failed to create identity: identity_id missing",
                });
                continue;
            }
            
            // Create balance (all employees use USD)
            const balanceResponse = await blnk.post("/balances", {
                ledger_id: ledgerInfo.ledger_id,
                identity_id: identityId,
                currency: "USD", // All employees use USD regardless of country
                meta_data: {
                    employee_id: emp.employee_id,
                    employee_name: emp.name,
                    country_code: emp.country_code,
                },
            });
            
            const balanceId = balanceResponse.data.balance_id;
            if (!balanceId) {
                errors.push({
                    employee_id: emp.employee_id,
                    error: "Failed to create balance: balance_id missing",
                });
                continue;
            }
            
            createdEmployees.push({
                ...emp,
                identity_id: identityId,
                balance_id: balanceId,
                ledger_id: ledgerInfo.ledger_id,
            });
            
            if ((i + 1) % 100 === 0) {
                log(`  Progress: ${i + 1}/${employees.length} employees created...`, "info");
            }
        } catch (error: any) {
            errors.push({
                employee_id: emp.employee_id,
                error: error.message || String(error),
            });
        }
    }
    
    log(`✅ Created ${createdEmployees.length} employees`, "success");
    if (errors.length > 0) {
        log(`⚠️  ${errors.length} employees failed to create`, "warning");
        if (errors.length <= 10) {
            errors.forEach((err) => {
                log(`  - ${err.employee_id}: ${err.error}`, "error");
            });
        }
    }
    log("");
    
    return createdEmployees;
}

// Calculate total payroll amount
function calculateTotalPayroll(employees: Employee[]): number {
    const total = employees.reduce((sum, emp) => sum + emp.salary_cents, 0);
    return total;
}

// Fund payroll account
async function fundPayrollAccount(totalAmount: number, currency: string = "USD"): Promise<string> {
    log(`Funding payroll account with ${currency} ${(totalAmount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}...`, "info");
    
    const payrollDate = new Date().toISOString().split("T")[0];
    const reference = `PAYROLL_FUNDING_${payrollDate}`;
    
    const fundingResponse = await blnk.post("/transactions", {
        amount: totalAmount,
        precision: 100,
        reference: reference,
        currency: currency,
        source: "@BankDeposits",
        destination: "@PayrollBalance",
        description: `Payroll funding for ${payrollDate}`,
        allow_overdraft: true,
        meta_data: {
            funding_type: "payroll",
            period: payrollDate,
        },
    });
    
    const transactionId = fundingResponse.data.transaction_id;
    if (!transactionId) {
        throw new Error("Failed to fund payroll account: transaction_id missing");
    }
    
    log(`✅ Payroll account funded`, "success");
    log(`   Transaction ID: ${transactionId}\n`, "info");
    
    return transactionId;
}

// Process payroll synchronously in batches
async function processPayrollSync(
    employees: Employee[],
    payrollDate: string
): Promise<string[]> {
    log(`Processing payroll synchronously in batches of ${SYNC_BATCH_SIZE}...`, "info");
    
    const batchIds: string[] = [];
    const totalBatches = Math.ceil(employees.length / SYNC_BATCH_SIZE);
    
    for (let i = 0; i < totalBatches; i++) {
        const start = i * SYNC_BATCH_SIZE;
        const end = Math.min(start + SYNC_BATCH_SIZE, employees.length);
        const batch = employees.slice(start, end);
        const batchNumber = i + 1;
        
        const transactions = batch.map((emp) => ({
            amount: emp.salary_cents,
            precision: 100,
            reference: `PAYROLL_${emp.employee_id}_${payrollDate}`,
            description: `Salary payment for ${emp.name} - ${payrollDate}`,
            currency: emp.currency,
            source: "@PayrollBalance",
            destination: emp.balance_id!,
            allow_overdraft: false,
            meta_data: {
                employee_id: emp.employee_id,
                employee_name: emp.name,
                payroll_period: payrollDate,
                payment_type: "salary",
                country_code: emp.country_code,
            },
        }));
        
        try {
            log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} transactions)...`, "info");
            const response = await blnk.post("/transactions/bulk", {
                run_async: false,
                transactions: transactions,
            });
            
            const batchId = response.data.batch_id;
            if (batchId) {
                batchIds.push(batchId);
            }
            
            log(`✅ Batch ${batchNumber} completed: ${response.data.status}`, "success");
            log(`   Batch ID: ${batchId || "N/A"}`, "info");
            log(`   Transaction Count: ${response.data.transaction_count || batch.length}\n`, "info");
        } catch (error: any) {
            log(`❌ Batch ${batchNumber} failed: ${error.message}`, "error");
            if (error.response) {
                log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`, "error");
            }
        }
    }
    
    log(`✅ Synchronous processing completed: ${batchIds.length} batches processed\n`, "success");
    return batchIds;
}

// Process payroll asynchronously
async function processPayrollAsync(
    employees: Employee[],
    payrollDate: string
): Promise<string> {
    log(`Processing payroll asynchronously for ${employees.length} employees...`, "info");
    
    const transactions = employees.map((emp) => ({
        amount: emp.salary_cents,
        precision: 100,
        reference: `PAYROLL_${emp.employee_id}_${payrollDate}`,
        description: `Salary payment for ${emp.name} - ${payrollDate}`,
        currency: emp.currency,
        source: "@PayrollBalance",
        destination: emp.balance_id!,
        allow_overdraft: false,
        meta_data: {
            employee_id: emp.employee_id,
            employee_name: emp.name,
            payroll_period: payrollDate,
            payment_type: "salary",
            country_code: emp.country_code,
        },
    }));
    
    const response = await blnk.post("/transactions/bulk", {
        run_async: true,
        transactions: transactions,
    });
    
    const batchId = response.data.batch_id;
    if (!batchId) {
        throw new Error("Failed to start async processing: batch_id missing");
    }
    
    log(`✅ Asynchronous processing started`, "success");
    log(`   Batch ID: ${batchId}`, "info");
    log(`   Status: ${response.data.status}`, "info");
    log(`   Message: ${response.data.message || "Processing in background"}\n`, "info");
    
    return batchId;
}


// Main execution flow
async function main() {
    try {
        log("🚀 Starting Bulk Payroll Demo\n", "info");
        
        const csvPath = join(process.cwd(), CSV_FILE);
        
        // Step 1: Generate or use existing CSV
        if (!existsSync(csvPath)) {
            generateSampleCSV(csvPath, TOTAL_EMPLOYEES);
        } else {
            log(`Using existing CSV file: ${csvPath}`, "info");
        }
        
        // Step 2: Parse CSV
        const employeeRecords = await parseEmployeeCSV(csvPath);
        
        // Step 3: Setup ledgers
        const uniqueCountries = new Set(employeeRecords.map((e) => e.country_code));
        const ledgerMap = await setupLedgers(uniqueCountries);
        
        // Step 4: Create employees
        const employees = await createEmployees(employeeRecords, ledgerMap);
        
        if (employees.length === 0) {
            throw new Error("No employees were created. Cannot proceed with payroll processing.");
        }
        
        // Step 5: Calculate total payroll
        const totalPayroll = calculateTotalPayroll(employees);
        log(`Total payroll amount: ${(totalPayroll / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD\n`, "info");
        
        // Step 6: Fund payroll account
        await fundPayrollAccount(totalPayroll, "USD");
        
        // Step 7: Process payroll
        const dateStr = new Date().toISOString();
        const payrollDate: string = dateStr.split("T")[0] ?? dateStr.substring(0, 10);
        const mode = PROCESSING_MODE.toLowerCase();
        
        if (mode === "async") {
            // Process all asynchronously
            const batchId = await processPayrollAsync(employees, payrollDate);
            if (batchId) {
                log(`\n💡 Note: Transactions are processing in the background. Use the batch_id (${batchId}) to query transactions later.`, "info");
            }
            log(`💡 Tip: Set up webhooks to listen for 'transaction.applied' events to track completion.`, "info");
        } else {
            // Process synchronously in batches
            const batchIds = await processPayrollSync(employees, payrollDate);
            if (batchIds.length > 0) {
                log(`\n💡 Note: All ${batchIds.length} batches have been processed. Use batch_ids to query transactions if needed.`, "info");
            }
        }
        
        // Summary
        log("\n📊 Summary", "info");
        log(`   • Employees in CSV: ${employeeRecords.length}`, "info");
        log(`   • Employees created: ${employees.length}`, "info");
        log(`   • Ledgers created: ${ledgerMap.size}`, "info");
        log(`   • Total payroll: $${(totalPayroll / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "info");
        log(`   • Processing mode: ${mode}`, "info");
        log(`\n💡 Tip: View full data on Blnk Cloud dashboard: https://cloud.blnkfinance.com`, "info");
        log(`💡 Tip: Set up webhooks to listen for 'transaction.applied' events for async processing`, "info");
    } catch (error: any) {
        log(`\n❌ Error running demo: ${error.message}`, "error");
        if (error.response) {
            log(`Error response: ${JSON.stringify(error.response.data, null, 2)}`, "error");
        }
        process.exit(1);
    }
}

main();
