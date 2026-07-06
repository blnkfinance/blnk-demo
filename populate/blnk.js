const axios = require('axios');
const config = require('./populate.config.json');

class BlnkAPI {
  constructor() {
    this.baseURL = config.connection.core_url;
    this.apiKey = config.connection.api_key;
    this.headers = {
      'Content-Type': 'application/json',
      'X-blnk-key': this.apiKey
    };
  }

  /**
   * Get a ledger by ID
   * @param {string} ledgerId - The ID of the ledger to get
   * @returns {Promise<boolean>} - True if ledger exists, false otherwise
   */
  async getLedger(ledgerId) {
    try {
      const response = await axios.get(`${this.baseURL}/ledgers/${ledgerId}`, {
        headers: this.headers
      });
      return response.status === 200;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create a new ledger
   * @param {string} name - The name of the ledger from config
   * @returns {Promise<string>} - The created ledger ID
   */
  async createLedger(name) {
    try {
      const response = await axios.post(`${this.baseURL}/ledgers`, {
        name: name,
        meta_data: {
          project_owner: "Blnk Populate Demo"
        }
      }, {
        headers: this.headers
      });

      return response.data.ledger_id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new balance
   * @param {string} ledgerId - The ID of the ledger
   * @param {string} identityId - The ID of the identity
   * @param {string} currency - The currency for the balance
   * @returns {Promise<string>} - The created balance ID
   */
  async createBalance(ledgerId, identityId, currency) {
    try {
      const response = await axios.post(`${this.baseURL}/balances`, {
        ledger_id: ledgerId,
        currency: currency,
        identity_id: identityId,
        meta_data: {
          created_by: "system-api"
        }
      }, {
        headers: this.headers
      });

      return response.data.balance_id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new identity
   * @param {Object} identityData - The identity object containing identity details
   * @returns {Promise<string>} - The created identity ID
   */
  async createIdentity(identityData) {
    try {
      const response = await axios.post(`${this.baseURL}/identities`, identityData, {
        headers: this.headers
      });

      return response.data.identity_id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create bulk transactions
   * @param {Array} transactions - Array of transaction objects
   * @returns {Promise<Object>} - The bulk transaction response
   */
  async createBulkTransaction(transactions) {
    try {
      const response = await axios.post(`${this.baseURL}/transactions/bulk`, {
        transactions: transactions,
        atomic: false,
        skip_queue: false,
        run_async: false
      }, {
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a single transaction (alternative to bulk)
   * @param {Object} transaction - Single transaction object
   * @returns {Promise<Object>} - The transaction response
   */
  async createSingleTransaction(transaction) {
    try {
      const response = await axios.post(`${this.baseURL}/transactions`, transaction, {
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BlnkAPI;
