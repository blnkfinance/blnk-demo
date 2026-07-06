const BlnkAPI = require('./blnk');
const { selectIdentities, log, loadConfig, buildTransactionObject, generateReconciliationCSV, generateInternalBalanceId } = require('./helper');
const path = require('path');
const identities = require('./identities.json');

/**
 * Simulates the onboarding process by creating identities and their balances
 * @returns {Promise<Object>} - Object containing created identity and balance IDs
 */
async function simulateOnboarding() {
    try {
        // Load configuration
        const config = loadConfig();
        if (!config || !config.populate) {
            log('Failed to load configuration', 'error');
            throw new Error('Failed to load configuration');
        }

        // Get ledger ID from config
        const ledgerId = config.populate.customer_ledger.ledger_id;
        if (!ledgerId) {
            log('Ledger ID not found in configuration', 'error');
            throw new Error('Ledger ID not found in configuration');
        }

        // Initialize BlnkAPI
        const blnkAPI = new BlnkAPI();

        // Check if ledger exists
        try {
            const ledgerExists = await blnkAPI.getLedger(ledgerId);
            if (!ledgerExists) {
                log(`Ledger with ID '${ledgerId}' does not exist`, 'error');
                throw new Error(`Ledger with ID '${ledgerId}' does not exist`);
            }
        } catch (ledgerError) {
            const safeMessage = ledgerError && ledgerError.response && ledgerError.response.data
                ? JSON.stringify(ledgerError.response.data)
                : ledgerError.message;
            log(`Ledger check failed: ${safeMessage}`, 'error');
            throw ledgerError;
        }

        // Select random identities based on config
        const selectedIdentities = selectIdentities(identities, config.populate.identities.created_num);
        if (!selectedIdentities) {
            log('Failed to select identities', 'error');
            throw new Error('Failed to select identities');
        }

        log(`Starting onboarding simulation for ${selectedIdentities.length} identities`, 'info');

        const results = {
            balances: [],
            errors: []
        };

        // Process each selected identity
        for (let i = 0; i < selectedIdentities.length; i++) {
            const identityData = selectedIdentities[i];
            
            try {
                // Create identity
                const identityId = await blnkAPI.createIdentity(identityData);

                // Determine currencies for balances
                const currencies = [...config.populate.identities.balances_per_identity];
                
                // Add local currency if enabled and not already in the list
                if (config.populate.identities.local_currency && identityData.iso_currency) {
                    if (!currencies.includes(identityData.iso_currency)) {
                        currencies.push(identityData.iso_currency);
                    }
                }

                // Create balances for each currency
                for (const currency of currencies) {
                    try {
                        const balanceId = await blnkAPI.createBalance(ledgerId, identityId, currency);
                        
                        results.balances.push({
                            id: balanceId,
                            currency: currency
                        });
                        
                    } catch (balanceError) {
                        results.errors.push({
                            type: 'balance_creation',
                            message: balanceError.message
                        });
                    }
                }

            } catch (identityError) {
                results.errors.push({
                    type: 'identity_creation',
                    message: identityError.message
                });
            }
        }

        // Summary
        log(`\n🎉 Onboarding simulation completed!`, 'success');
        log(`📊 Summary:`, 'info');
        log(`   • Identities created: ${selectedIdentities.length}`, 'info');
        log(`   • Balances created: ${results.balances.length}`, 'info');
        log(`   • Errors encountered: ${results.errors.length}`, results.errors.length > 0 ? 'warning' : 'info');

        if (results.errors.length > 0) {
            log(`\n⚠️  Errors encountered:`, 'warning');
            results.errors.forEach((error, index) => {
                log(`   ${index + 1}. ${error.type}: ${error.message}`, 'error');
            });
        }

        return results;

    } catch (error) {
        log(`Onboarding simulation failed: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Simulates transactions between balances
 * @param {Array} balances - Array of balance objects from simulateOnboarding
 * @param {boolean} useInternalBalances - Whether to generate unique internal balance IDs per transaction
 * @returns {Promise<Object>} - Object containing transaction results and errors
 */
async function simulateTransactions(balances, useInternalBalances = false) {
    try {
        // Load configuration
        const config = loadConfig();
        if (!config || !config.populate) {
            throw new Error('Failed to load configuration');
        }

        // Initialize BlnkAPI
        const blnkAPI = new BlnkAPI();

        const requestedCount = config.populate.transactions.created_num;
        log(`Starting transaction simulation for ${requestedCount} transactions`, 'info');

        const transactions = [];

        // Group balances by currency for inter transactions
        const balancesByCurrency = {};
        balances.forEach(balance => {
            if (!balancesByCurrency[balance.currency]) {
                balancesByCurrency[balance.currency] = [];
            }
            balancesByCurrency[balance.currency].push(balance);
        });
        
        // Get available currencies from config if using internal balances
        const availableCurrencies = useInternalBalances 
            ? (config.populate.identities.balances_per_identity || ['USD'])
            : Object.keys(balancesByCurrency);

        // Generate transactions
        for (let i = 0; i < requestedCount; i++) {
            try {
                const transactionType = getRandomTransactionType();
                const transaction = buildTransaction(transactionType, balancesByCurrency, useInternalBalances, availableCurrencies);
                transactions.push(transaction);
            } catch (error) {
                log(`⚠️  Transaction ${i + 1}: ${error.message}, continuing with other transactions`, 'warning');
            }
        }

        // Generate reconciliation CSV for USD transactions
        // if (transactions.length > 0) {
        //     const csvPath = path.join(__dirname, 'reconciliation.csv');
        //     generateReconciliationCSV(transactions, csvPath);
        // }

        // Execute bulk transaction in batches of 5000
        const batchSize = 5000;
        const bulkResults = [];
        let totalCreated = 0;
        let totalFailed = 0;

        if (transactions.length > 0) {
            const totalBatches = Math.ceil(transactions.length / batchSize);
            log(`Posting ${transactions.length} transactions in ${totalBatches} batch(es) of ${batchSize}...`, 'info');

            for (let i = 0; i < totalBatches; i++) {
                const start = i * batchSize;
                const end = Math.min(start + batchSize, transactions.length);
                const batch = transactions.slice(start, end);
                const batchNumber = i + 1;

                try {
                    log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} transactions)...`, 'info');
                    const batchResult = await blnkAPI.createBulkTransaction(batch);
                    bulkResults.push(batchResult);
                    totalCreated += batch.length;
                    log(`✅ Batch ${batchNumber} completed: ${batch.length} transactions created`, 'success');
                } catch (error) {
                    totalFailed += batch.length;
                    log(`❌ Failed to execute batch ${batchNumber}: ${error.message}`, 'error');
                    bulkResults.push({ error: error.message, batch: batchNumber });
                }
            }

            log(`✅ All batches completed: ${totalCreated} created, ${totalFailed} failed`, totalFailed > 0 ? 'warning' : 'success');
        }

        // Summary
        log(`\n🎉 Transaction simulation completed!`, 'success');
        log(`📊 Summary:`, 'info');
        log(`   • Requested transactions: ${requestedCount}`, 'info');
        log(`   • Transactions created: ${transactions.length}`, 'info');
        if (transactions.length !== requestedCount) {
            log(`   ⚠️  Warning: Created ${transactions.length} transactions but requested ${requestedCount}`, 'warning');
        }

        return {
            transactions: transactions,
            bulkResults: bulkResults,
            totalCreated: totalCreated,
            totalFailed: totalFailed
        };

    } catch (error) {
        log(`Transaction simulation failed: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Gets a random transaction type
 * @returns {string} - Random transaction type
 */
function getRandomTransactionType() {
    const types = ['Deposit', 'Withdrawal', 'Inter'];
    return types[Math.floor(Math.random() * types.length)];
}

/**
 * Builds a transaction object based on type
 * @param {string} type - Transaction type
 * @param {Object} balancesByCurrency - Balances grouped by currency
 * @param {boolean} useInternalBalances - Whether to generate unique internal balance IDs per transaction
 * @param {Array} availableCurrencies - Available currencies to use (for internal balances mode)
 * @returns {Object} - Transaction object
 */
function buildTransaction(type, balancesByCurrency, useInternalBalances = false, availableCurrencies = []) {
    // Get currency - use availableCurrencies if provided, otherwise from balancesByCurrency
    const currencies = availableCurrencies.length > 0 ? availableCurrencies : Object.keys(balancesByCurrency);
    if (currencies.length === 0) {
        throw new Error('No currencies available for transaction');
    }
    const currency = currencies[Math.floor(Math.random() * currencies.length)];
    
    let source, destination;
    
    if (useInternalBalances) {
        // Generate unique internal balance IDs for each transaction
        if (type === 'Deposit') {
            source = `@World-${currency}`;
            destination = generateInternalBalanceId();
        } else if (type === 'Withdrawal') {
            source = generateInternalBalanceId();
            destination = `@World-${currency}`;
        } else { // Inter
            source = generateInternalBalanceId();
            destination = generateInternalBalanceId();
            // Ensure source and destination are different
            while (destination === source) {
                destination = generateInternalBalanceId();
            }
        }
    } else {
        // Use existing balances from the pool
        const balances = balancesByCurrency[currency];
        
        // For Inter transactions, need at least 2 balances
        if (type === 'Inter' && balances.length < 2) {
            throw new Error(`Not enough balances for inter transaction in currency ${currency}`);
        }
        
        const sourceBalance = balances[Math.floor(Math.random() * balances.length)];
        let destinationBalance;
        
        // For Inter, ensure destination is different from source
        if (type === 'Inter') {
            let destinationIndex = Math.floor(Math.random() * balances.length);
            while (destinationIndex === balances.indexOf(sourceBalance)) {
                destinationIndex = Math.floor(Math.random() * balances.length);
            }
            destinationBalance = balances[destinationIndex];
        }
        
        source = type === 'Deposit' ? `@World-${currency}` : sourceBalance.id;
        destination = type === 'Withdrawal' ? `@World-${currency}` : (type === 'Inter' ? destinationBalance.id : sourceBalance.id);
    }
    
    return buildTransactionObject(source, destination, type, currency);
}

module.exports = {
    simulateOnboarding,
    simulateTransactions
};
