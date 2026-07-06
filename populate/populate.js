const { simulateOnboarding, simulateTransactions } = require('./simulate');
const { log, loadConfig, generateInternalBalanceId } = require('./helper');

/**
 * Main function to populate a Blnk instance with test data
 * Orchestrates the complete flow: onboarding → transactions
 */
async function populate() {
    try {
        log('🚀 Starting Blnk instance population...', 'info');
        
        // Load configuration
        const config = loadConfig();
        if (!config || !config.populate) {
            throw new Error('Failed to load configuration. Please ensure populate.config.json exists.');
        }

        // Validate required configuration
        if (!config.populate.connection.core_url) {
            throw new Error('Missing required connection configuration (core_url)');
        }

        if (!config.populate.customer_ledger.ledger_id) {
            throw new Error('Missing ledger_id in customer_ledger configuration');
        }

        let onboardingResult;
        let balances;

        // Check if we should use internal balances instead of creating real ones
        const useInternalBalances = config.populate.use_internal_balances === true;

        if (useInternalBalances) {
            // Skip onboarding - balances will be generated per transaction
            log('\x1b[1mPhase 1: Skipping onboarding...\x1b[0m', 'info');
            log('Using internal balances - will generate unique balance IDs per transaction', 'info');
            
            // Create empty balances array - balances will be generated per transaction
            balances = [];
            
            onboardingResult = {
                balances: balances,
                errors: []
            };
            
            log(`Skipped balance creation - will use internal balances for transactions`, 'success');
        } else {
            // Phase 1: Onboarding (Create identities and balances)
            log('\x1b[1mPhase 1: Onboarding simulation...\x1b[0m', 'info');
            onboardingResult = await simulateOnboarding();
            balances = onboardingResult.balances;
        }
        
        // 2 second delay between phases
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Starting next phase...');

        // Phase 2: Transactions (Create transactions between balances)
        log('\x1b[1mPhase 2: Transaction simulation...\x1b[0m', 'info');
        const transactionResult = await simulateTransactions(balances, useInternalBalances);

        // Final Summary
        log(`\n🎉 Blnk instance population completed successfully!`, 'success');
        if (useInternalBalances) {
            log(`📊 Summary: ${transactionResult.transactions.length} transactions created (using unique internal balance IDs per transaction)`, 'info');
        } else {
            log(`📊 Summary: ${onboardingResult.balances.length} balances, ${transactionResult.transactions.length} transactions created`, 'info');
        }

        return {
            success: true,
            onboarding: onboardingResult,
            transactions: transactionResult,
            summary: {
                useInternalBalances: useInternalBalances,
                identitiesProcessed: useInternalBalances ? 0 : config.populate.identities.created_num,
                balancesCreated: onboardingResult.balances.length,
                transactionsCreated: transactionResult.transactions.length,
                totalOperations: onboardingResult.balances.length + transactionResult.transactions.length
            }
        };

    } catch (error) {
        log(`❌ Population failed: ${error.message}`, 'error');
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the population if this script is executed directly
if (require.main === module) {
    populate()
        .then(result => {
            if (result.success) {
                process.exit(0);
            } else {
                process.exit(1);
            }
        })
        .catch(error => {
            log(`\n💥 Unexpected error: ${error.message}`, 'error');
            process.exit(1);
        });
}

module.exports = { populate };
