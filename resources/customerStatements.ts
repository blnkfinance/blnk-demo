export interface StatementTransaction {
  timestamp: string;
  reference: string;
  description: string;
  direction: "DR" | "CR";
  counterparty: string;
  amount: string;
  currency: string;
}

export interface Statement {
  balance_id: string;
  currency: string;
  account_name: string;
  period: {
    start: string;
    end: string;
  };
  opening_balance: string;
  closing_balance: string;
  totals: {
    credits: string;
    debits: string;
    transaction_count: number;
  };
  transactions: StatementTransaction[];
}
