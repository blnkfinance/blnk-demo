const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Generates a reference string in the format ref-{{uuid}}
 * @returns {string} Reference string with UUID
 */
function generateReference() {
    return `ref-${uuidv4()}`;
}

/**
 * Centralized logging function
 * @param {string} message - The message to log
 * @param {string} type - The type of log (info, error, success, warning)
 */
function log(message, type = 'info') {
    const colors = {
        info: '\x1b[36m',     // Cyan
        error: '\x1b[31m',    // Red
        success: '\x1b[32m',  // Green
        warning: '\x1b[33m'   // Yellow
    };
    const reset = '\x1b[0m';
    const color = colors[type] || colors.info;
    
    console.log(`${color}[${type.toUpperCase()}]${reset} ${message}`);
}

/**
 * Loads the configuration from populate.config.json and crisscross.config.json
 * @returns {Object} Object with populate and crisscross properties, or null if both files don't exist
 */
function loadConfig() {
    const populateConfigPath = path.join(__dirname, 'populate.config.json');
    const crisscrossConfigPath = path.join(__dirname, 'crisscross.config.json');
    
    const result = {
        populate: null,
        crisscross: null
    };
    
    // Load populate.config.json
    try {
        if (fs.existsSync(populateConfigPath)) {
            const configData = fs.readFileSync(populateConfigPath, 'utf8');
            result.populate = JSON.parse(configData);
        }
    } catch (error) {
        log(`Error loading populate config: ${error.message}`, 'error');
    }
    
    // Load crisscross.config.json
    try {
        if (fs.existsSync(crisscrossConfigPath)) {
            const configData = fs.readFileSync(crisscrossConfigPath, 'utf8');
            result.crisscross = JSON.parse(configData);
        }
    } catch (error) {
        log(`Error loading crisscross config: ${error.message}`, 'error');
    }
    
    // Return null only if both configs are missing
    if (!result.populate && !result.crisscross) {
        return null;
    }
    
    return result;
}

/**
 * Saves the configuration to populate.config.json
 * @param {Object} config - The configuration object to save
 * @returns {boolean} True if successful, false otherwise
 */
function saveConfig(config) {
    const configPath = path.join(__dirname, 'populate.config.json');
    
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        log('Configuration saved successfully', 'success');
        return true;
    } catch (error) {
        log(`Error saving config: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Generates a random amount within the configured range
 * Uses a uniform distribution to ensure truly random amounts
 * @returns {number} Random amount within the specified range
 */
function generateRandomAmount() {
    const config = loadConfig();
    if (!config || !config.populate) {
        throw new Error('Failed to load configuration for amount generation');
    }
    
    const { min, max } = config.populate.transactions.amount_range;
    
    // Use Math.random() for uniform distribution
    // Multiply by (max - min + 1) to include max value
    // Add min to shift the range
    const randomAmount = Math.floor(Math.random() * (max - min + 1)) + min;
    
    return randomAmount;
}

/**
 * Selects a specified number of identities at random from a JSON of identities
 * If count exceeds available identities, it will repeat identities to reach the requested count
 * @param {Array} identities - Array of identity objects
 * @param {number} count - Number of identities to select
 * @returns {Array|null} Array of selected identity objects (may include repeats), or null if invalid inputs
 */
function selectIdentities(identities, count) {
    if (!Array.isArray(identities) || identities.length === 0) {
        log('No identities available. Please ensure identities are created first.', 'error');
        return null;
    }
    
    if (count <= 0) {
        log('Invalid count. Please provide a positive number.', 'error');
        return null;
    }
    
    // If count exceeds available identities, repeat identities to reach the requested count
    if (count > identities.length) {
        log(`Requested count (${count}) exceeds available identities (${identities.length}). Repeating identities to reach requested count.`, 'info');
        
        const result = [];
        const shuffled = [...identities];
        
        // Shuffle the identities array
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Repeat identities until we reach the requested count
        for (let i = 0; i < count; i++) {
            // Create a deep copy to avoid reference issues
            const identityCopy = JSON.parse(JSON.stringify(shuffled[i % shuffled.length]));
            result.push(identityCopy);
        }
        
        return result;
    }
    
    // If count is less than or equal to available identities, select randomly
    const shuffled = [...identities];
    
    // Fisher-Yates shuffle algorithm for truly random selection
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Return the first 'count' elements from the shuffled array
    return shuffled.slice(0, count);
}


/**
 * Generates a random date within the specified range
 * @param {Object} options - Configuration options
 * @param {Date|string|number} options.startDate - Start date (default: 1 week ago)
 * @param {Date|string|number} options.endDate - End date (default: now)
 * @param {string} options.format - Output format: 'iso' (ISO string), 'timestamp' (milliseconds), or 'date' (Date object) (default: 'iso')
 * @returns {string|number|Date} Random date in the specified format
 */
function generateDate(options = {}) {
    const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default: 1 week ago
        endDate = new Date(), // Default: now
        format = 'iso' // Default: ISO string
    } = options;

    // Convert inputs to Date objects if needed
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date provided to generateDate');
    }

    if (start > end) {
        throw new Error('startDate must be before or equal to endDate');
    }

    // Generate random timestamp between start and end
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = Math.floor(Math.random() * (endTime - startTime + 1)) + startTime;
    const randomDate = new Date(randomTime);

    // Return in requested format
    switch (format.toLowerCase()) {
        case 'iso':
            return randomDate.toISOString();
        case 'timestamp':
            return randomTime;
        case 'date':
            return randomDate;
        default:
            return randomDate.toISOString();
    }
}

/**
 * Generates a CSV file from USD transactions with reconciliation errors for testing
 * Includes: 1% drift, wrong amounts, missing transactions, and date offsets
 * @param {Array} transactions - Array of transaction objects
 * @param {string} outputPath - Path where the CSV file should be saved
 * @returns {boolean} True if successful, false otherwise
 */
function generateReconciliationCSV(transactions, outputPath) {
    try {
        // Filter only USD transactions
        const usdTransactions = transactions.filter(txn => txn.currency === 'USD');
        
        if (usdTransactions.length === 0) {
            // log('No USD transactions found for CSV generation', 'warning');
            return false;
        }

        // Log initial statistics
        // log(`\n📝 Generating reconciliation CSV from ${usdTransactions.length} USD transactions...`, 'info');
        // log(`   Expected breakdown (approximate):`, 'info');
        // log(`   • Will be excluded (missing): ~${Math.round(usdTransactions.length * 0.1)} (10%)`, 'info');
        // log(`   • Will have wrong amounts: ~${Math.round(usdTransactions.length * 0.9 * 0.3)} (30% of included)`, 'info');
        // log(`   • Will be correct: ~${Math.round(usdTransactions.length * 0.9 * 0.7)} (70% of included)`, 'info');
        // log(`   • Will have wrong dates: ~${Math.round(usdTransactions.length * 0.9 * 0.15)} (15% of included)`, 'info');

        // CSV header
        const csvRows = ['id,amount,currency,reference,description,date,source'];
        
        let includedCount = 0;
        let excludedCount = 0;
        let wrongAmountCount = 0;
        let correctAmountCount = 0;
        let wrongDateCount = 0;
        let idCounter = 1;
        
        // Process each USD transaction
        usdTransactions.forEach(txn => {
            // Randomly exclude some transactions (10% chance)
            if (Math.random() < 0.1) {
                excludedCount++;
                return; // Skip this transaction
            }
            
            includedCount++;
            
            // Determine amount handling
            let finalAmount;
            let hasWrongAmount = false;
            const amountRandom = Math.random();
            
            if (amountRandom < 0.3) {
                // 30% chance: Make amount significantly wrong (10-50% off or completely different)
                hasWrongAmount = true;
                const wrongType = Math.random();
                if (wrongType < 0.5) {
                    // Wrong by percentage (10-50% off)
                    const wrongFactor = 0.5 + (Math.random() * 0.5); // Between 0.5 and 1.0, or 1.1 and 1.5
                    const direction = Math.random() < 0.5 ? -1 : 1;
                    finalAmount = Math.round(txn.amount * (1 + (wrongFactor * direction)));
                } else {
                    // Completely wrong amount (random value in similar range)
                    const config = loadConfig();
                    if (config && config.populate) {
                        const { min, max } = config.populate.transactions.amount_range;
                        finalAmount = Math.floor(Math.random() * (max - min + 1)) + min;
                    } else {
                        // Fallback: use original amount with large variation
                        finalAmount = Math.round(txn.amount * (0.5 + Math.random()));
                    }
                }
                wrongAmountCount++;
            } else {
                // 70% chance: Amount stays exactly equal (no drift)
                finalAmount = txn.amount;
                correctAmountCount++;
            }
            
            // Determine date handling
            let finalDate = txn.effective_date;
            if (Math.random() < 0.15) {
                // 15% chance: Shift date by 1 hour (forward or backward)
                const dateObj = new Date(txn.effective_date);
                const direction = Math.random() < 0.5 ? -1 : 1; // -1 hour or +1 hour
                dateObj.setHours(dateObj.getHours() + direction);
                finalDate = dateObj.toISOString();
                wrongDateCount++;
            }
            
            // Escape description if it contains commas or quotes
            const escapedDescription = txn.description.replace(/"/g, '""');
            
            // Format the row: id, amount, currency, reference, description, date, source
            csvRows.push(
                `${idCounter},${finalAmount},"${txn.currency}","${txn.reference}","${escapedDescription}","${finalDate}","Stripe"`
            );
            
            idCounter++;
        });

        // Write CSV file
        const csvContent = csvRows.join('\n');
        fs.writeFileSync(outputPath, csvContent, 'utf8');
        
        // Log final statistics
        // log(`\n✅ Reconciliation CSV generated: ${includedCount} USD transactions saved to ${outputPath}`, 'success');
        // log(`📊 CSV Breakdown:`, 'info');
        // log(`   • Total USD transactions: ${usdTransactions.length}`, 'info');
        // log(`   • Excluded (missing from CSV): ${excludedCount} (${((excludedCount / usdTransactions.length) * 100).toFixed(1)}%)`, 'info');
        // log(`   • Included in CSV: ${includedCount} (${((includedCount / usdTransactions.length) * 100).toFixed(1)}%)`, 'info');
        // log(`   • Correct amounts: ${correctAmountCount} (${((correctAmountCount / includedCount) * 100).toFixed(1)}% of included)`, 'success');
        // log(`   • Wrong amounts: ${wrongAmountCount} (${((wrongAmountCount / includedCount) * 100).toFixed(1)}% of included)`, 'warning');
        // log(`   • Wrong dates (1 hour off): ${wrongDateCount} (${((wrongDateCount / includedCount) * 100).toFixed(1)}% of included)`, 'warning');
        return true;
    } catch (error) {
        // log(`Error generating reconciliation CSV: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Builds a transaction object with the specified parameters
 * @param {string} sourceBalance - Source balance ID or @World-{currency}
 * @param {string} destinationBalance - Destination balance ID or @World-{currency}
 * @param {string} type - Transaction type (Deposit, Withdrawal, Inter)
 * @param {string} currency - Currency code
 * @returns {Object} - Transaction object
 */
function buildTransactionObject(sourceBalance, destinationBalance, type, currency) {
    return {
        amount: generateRandomAmount(),
        precision: 100,
        currency: currency,
        reference: generateReference(),
        source: sourceBalance,
        destination: destinationBalance,
        description: `${type} transaction`,
        allow_overdraft: true,
        effective_date: generateDate(),
        meta_data: {
            transaction_type: type,
            created_by: 'blnk-populate-demo'
        }
    };
}

/**
 * Generates a random alphanumeric string of specified length
 * @param {number} length - Length of the string to generate
 * @returns {string} Random alphanumeric string
 */
function generateRandomAlphanumeric(length = 30) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generates a random internal balance ID (alphanumeric with @ prefix)
 * @returns {string} Random balance identifier with @ prefix
 */
function generateInternalBalanceId() {
    return '@' + generateRandomAlphanumeric(30);
}

module.exports = {
    generateReference,
    log,
    loadConfig,
    saveConfig,
    generateRandomAmount,
    selectIdentities,
    generateDate,
    generateReconciliationCSV,
    buildTransactionObject,
    generateRandomAlphanumeric,
    generateInternalBalanceId
};
