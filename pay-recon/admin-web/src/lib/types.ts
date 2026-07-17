export type Merchant = {
  id: string;
  name: string;
  tin?: string | null;
  bank_account_number: string;
  bank_name: string;
  blnk_balance_id: string;
  status: string;
  created_at: string;
};

export type WHTCategory = {
  id: string;
  code: string;
  label: string;
  rate: string | number;
  active: boolean;
};

export type Bill = {
  id: string;
  bill_reference: string;
  vendor_invoice_ref?: string | null;
  merchant_id: string;
  wht_category_id: string;
  purpose: string;
  gross_amount: number;
  wht_rate: string;
  wht_amount: number;
  net_amount: number;
  currency: string;
  status: string;
  bank_payment_reference?: string | null;
  bank_payment_date?: string | null;
  payment_confirmed_at?: string | null;
  payment_confirmed_by?: string | null;
  payment_note?: string | null;
  created_at: string;
  paid_at?: string | null;
};

export type PaymentInstruction = {
  account_number: string;
  bank_name: string;
  amount: number;
  narration: string;
  currency: string;
};

export type ReconRun = {
  id: string;
  blnk_reconciliation_id: string;
  statement_upload_id: string;
  strategy: string;
  matched_count?: number | null;
  unmatched_count?: number | null;
  status: string;
  started_at: string;
  completed_at?: string | null;
};

export type StatementUpload = {
  id: string;
  source: string;
  cadence: string;
  record_count: number;
  rows_read: number;
  rows_imported: number;
  rows_skipped: number;
  credits_synced: number;
  blnk_note?: string;
  uploaded_by: string;
  uploaded_at: string;
};

export type Remittance = {
  id: string;
  period: string;
  total_amount: number;
  blnk_txn_id: string;
  status: string;
  bank_payment_reference?: string | null;
  bank_payment_date?: string | null;
  payment_confirmed_at?: string | null;
  payment_note?: string | null;
  remitted_at?: string | null;
  created_at: string;
};

export type ActionState = {
  error?: string;
  success?: string;
  data?: Record<string, unknown>;
};
